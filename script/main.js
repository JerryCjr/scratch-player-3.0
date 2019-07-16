"use strict";
window.__bbfs_scratch = {}; // 适应业务的全局实例
window.__bbfs_scratch['debug'] = true;
const bridge = window['babyfs-jsbridge'].default;
// bridge.callHandler('setScreenHoriz');
// debug 开关
function switchDebug(cb) {
    if (window.__bbfs_scratch['debug']) {
        cb && cb();
    }
}
switchDebug(function () {
    new VConsole(); // debug vconsole init
});
window.devicePixelRatio = 3;
detectOrient(); // 监测屏幕方向
window.onresize = debounce(detectOrient, 300);
const bar1 = new ldBar("#progress-loading");
const bar2 = document.getElementById('progress-loading').ldBar;
const loading = document.getElementById('progress-loading');
const canvas = document.getElementById('ocanvas');
bar1.set(10);
// loading显示隐藏开关切换
function switchLoading(_sw) {
    if (_sw) {
        loading.style.display = 'block';
        canvas.style.display = 'none';
    } else {
        loading.style.display = 'none';
        canvas.style.display = 'block';
    }
}
// 切换项目前
function beforeSwitchProject() {
    switchLoading(true);
    vm.stopAll();
    vm.clear();
}
// 切换项目后
function afterSwitchProject() {
    switchLoading(false);
    vm.greenFlag(); // 执行程序
}
switchLoading(true);
const dragThreshold = 3;
const state = {
    mouseDown: false,
    mouseDownTimeoutId: null,
    mouseDownPosition: null,
    isDragging: false,
    dragOffset: null,
    dragId: null
};
const render = new ScratchRender(canvas);
const vm = new VirtualMachine();
const storage = new ScratchStorage();
const audioEngine = new AudioEngine();
resizeCanvas(canvas, __bbfs_scratch['canvasW'], __bbfs_scratch['canvasH'])
vm.attachStorage(storage);
vm.attachRenderer(render);
vm.attachAudioEngine(audioEngine);
vm.attachV2SVGAdapter(new ScratchSVGRenderer.SVGRenderer());
vm.attachV2BitmapAdapter(new ScratchSVGRenderer.BitmapAdapter());
vm.runtime.on('PROJECT_START', (e) => {
    bar1.set(100);
    bridge.callHandler('ready');
    window.__bbfs_scratch['LOADED_PROJECT'] = +new Date();
    window.__bbfs_scratch['LOAD_PROJECT_DURATION'] = window.__bbfs_scratch['LOADED_PROJECT'] - window.__bbfs_scratch['LOAD_PROJECT'];
    window.__bbfs_scratch['WHOLE_DURATION'] = window.__bbfs_scratch['LOADED_PROJECT'] - window.__bbfs_scratch['LOAD'];

    function showDebugInfo() {
        // SCREEN
        console.log('[clientWidth]', window.__bbfs_scratch['clientWidth']);
        console.log('[clientHeight]', window.__bbfs_scratch['clientHeight']);
        console.log('[screenWidth]', window.__bbfs_scratch['screenWidth']);
        console.log('[screenHeight]', window.__bbfs_scratch['screenHeight']);
        console.log('[canvasW]', window.__bbfs_scratch['canvasW']);
        console.log('[canvasH]', window.__bbfs_scratch['canvasH']);
        // WINDOW.LOAD
        console.log('[LOAD]', window.__bbfs_scratch['LOAD']);
        console.log('[UNLOAD]', window.__bbfs_scratch['UNLOAD']);
        console.log('[LOAD_DURATION]', window.__bbfs_scratch['LOAD_DURATION']);
        // PROJECT
        console.log('[FETCH_SB3]', window.__bbfs_scratch['FETCH_SB3']);
        console.log('[FETCHED_SB3]', window.__bbfs_scratch['FETCHED_SB3']);
        console.log('[FETCH_SB3_DURATION]', window.__bbfs_scratch['FETCH_SB3_DURATION']);
        // LOAD SB3
        console.log('[LOAD_SB3]', window.__bbfs_scratch['LOAD_SB3']);
        console.log('[LOADED_SB3]', window.__bbfs_scratch['LOADED_SB3']);
        console.log('[LOAD_SB3_DURATION]', window.__bbfs_scratch['LOAD_SB3_DURATION']);
        // PROJECT
        console.log('[LOAD_PROJECT]', window.__bbfs_scratch['LOAD_PROJECT']);
        console.log('[LOADED_PROJECT]', window.__bbfs_scratch['LOADED_PROJECT']);
        console.log('[LOAD_PROJECT_DURATION]', window.__bbfs_scratch['LOAD_PROJECT_DURATION']);
        // DURATION
        window.__bbfs_scratch['LOAD_TO_FETCH_DURATION'] = window.__bbfs_scratch['FETCHED_SB3'] - window.__bbfs_scratch['LOAD'];
        window.__bbfs_scratch['SCRIPT_START']
        console.log('[LOAD_TO_FETCH_DURATION]', window.__bbfs_scratch['LOAD_TO_FETCH_DURATION']);
        console.log('[WHOLE_DURATION]', window.__bbfs_scratch['WHOLE_DURATION']);
        console.log('[SCRIPT_TO_PROJECT_DURATION]', window.__bbfs_scratch['SCRIPT_TO_PROJECT_DURATION']);
        // console.log(window.performance);
        // console.log('[MEMORY]', window.performance['memory']);
        // console.log('[TIMING]', window.performance['timing']);
    }

    switchDebug(showDebugInfo);
})
// 监听[jsbridge callhandler]的广播信息
vm.runtime.on('event_whenbroadcastreceived_shouldcalljsbridge', (e) => {
    console.log(e);
    if (e) {
        if (e.name) {
            const eventName = e.name;
            bridge.callHandler(eventName);
        }
    }
})

// 注册[jsbridge registerhandler]的事件
function bridgeRegisterHandler() {
    bridge.registerHandler('swipe', function (params) {
        console.log(params);
        window._swipe(params);
    })
}

// 绑定鼠标事件
function attachMouseEvents(canvas) {
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onMouseMove);
    document.addEventListener('touchend', onMouseUp);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('touchstart', onMouseDown);
}

function detachMouseEvents(canvas) {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.removeEventListener('touchmove', onMouseMove);
    document.removeEventListener('touchend', onMouseUp);
    canvas.removeEventListener('mousedown', onMouseDown);
    canvas.removeEventListener('touchstart', onMouseDown);
}

function onMouseMove(e) {
    const { x, y } = getEventXY(e);
    const rect = canvas.getBoundingClientRect();
    const mousePosition = [x - rect.left, y - rect.top];

    if (state.mouseDown && !state.isDragging) {
        const distanceFromMouseDown = Math.sqrt(
            Math.pow(mousePosition[0] - state.mouseDownPosition[0], 2) +
            Math.pow(mousePosition[1] - state.mouseDownPosition[1], 2)
        );
        if (distanceFromMouseDown > dragThreshold) {
            cancelMouseDownTimeout();
            onStartDrag(...state.mouseDownPosition);
        }
    }

    if (state.mouseDown && state.isDragging) {
        // Editor drag style only updates the drag canvas, does full update at the end of drag
        // Non-editor drag style just updates the sprite continuously.
        const spritePosition = getScratchCoords(mousePosition[0], mousePosition[1]);
        vm.postSpriteInfo({
            x: spritePosition[0] + state.dragOffset[0],
            y: -(spritePosition[1] + state.dragOffset[1]),
            force: true
        });
    }
    const coordinates = {
        x: mousePosition[0],
        y: mousePosition[1],
        canvasWidth: rect.width,
        canvasHeight: rect.height
    };
    vm.postIOData('mouse', coordinates);
}

function onMouseUp(e) {
    const { x, y } = getEventXY(e);
    const rect = canvas.getBoundingClientRect();
    const mousePosition = [x - rect.left, y - rect.top];
    cancelMouseDownTimeout();
    state['mouseDown'] = false;
    state['mouseDownPosition'] = null;
    const data = {
        isDown: false,
        x: mousePosition[0],
        y: mousePosition[1],
        canvasWidth: rect.width,
        canvasHeight: rect.height,
        wasDragged: state.isDragging
    };
    if (state.isDragging) {
        onStopDrag(mousePosition[0], mousePosition[1]);
    }
    vm.postIOData('mouse', data);
}

function onMouseDown(e) {
    const { x, y } = getEventXY(e);
    const rect = canvas.getBoundingClientRect();
    const mousePosition = [x - rect.left, y - rect.top];
    if (e.button === 0 || (window.TouchEvent && e instanceof TouchEvent)) {
        state['mouseDown'] = true;
        state['mouseDownPosition'] = mousePosition;
        // state['mouseDownTimeoutId'] = setTimeout(onStartDrag(mousePosition[0], mousePosition[1]), 400)
    }
    const data = {
        isDown: true,
        x: mousePosition[0],
        y: mousePosition[1],
        canvasWidth: rect.width,
        canvasHeight: rect.height
    };

    vm.postIOData('mouse', data);
    if (e.preventDefault) {
        // Prevent default to prevent touch from dragging page
        e.preventDefault();
        // But we do want any active input to be blurred
        if (document.activeElement && document.activeElement.blur) {
            document.activeElement.blur();
        }
    }
}

function cancelMouseDownTimeout() {
    if (state.mouseDownTimeoutId !== null) {
        clearTimeout(state.mouseDownTimeoutId);
    }
    state['mouseDownTimeoutId'] = null;
}

function onStartDrag(x, y) {
    if (state.dragId) return;
    const drawableId = render.pick(x, y);
    if (drawableId === null) return;
    const targetId = vm.getTargetIdForDrawableId(drawableId);
    if (targetId === null) return;

    const target = vm.runtime.getTargetById(targetId);

    // Do not start drag unless in editor drag mode or target is draggable
    if (!target.draggable) return;

    // Dragging always brings the target to the front
    target.goToFront();

    // Extract the drawable art
    const drawableData = render.extractDrawable(drawableId, x, y);

    vm.startDrag(targetId);

    state['isDragging'] = true;
    state['dragId'] = targetId;
    state['dragOffset'] = drawableData.scratchOffset;
}

function onStopDrag(mouseX, mouseY) {
    const dragId = state.dragId;
    const commonStopDragActions = () => {
        vm.stopDrag(dragId);
        state['isDragging'] = false;
        state['dragOffset'] = null;
        state['dragId'] = null;
    };
    commonStopDragActions();
}

function getScratchCoords(x, y) {
    const nativeSize = render.getNativeSize();
    const rect = canvas.getBoundingClientRect();
    return [
        (nativeSize[0] / rect.width) * (x - (rect.width / 2)),
        (nativeSize[1] / rect.height) * (y - (rect.height / 2))
    ];
}

// 本地读取sb*文件(sb3)
function readFromSb(targert) {
    window.__bbfs_scratch['LOAD_SB3'] = +new Date();
    const reader = new FileReader();
    reader.onload = () => {
        console.log(reader.result);
        window.__bbfs_scratch['LOADED_SB3'] = +new Date();
        window.__bbfs_scratch['LOAD_SB3_DURATION'] = window.__bbfs_scratch.LOADED_SB3 - window.__bbfs_scratch.LOAD_SB3;
        vm.start();
        window.__bbfs_scratch['LOAD_PROJECT'] = +new Date();
        vm.loadProject(reader.result)
            .then(() => {
                afterSwitchProject();
            });
    };
    reader.readAsArrayBuffer(targert);
}

// fetch scratch files(sb3)
// function fetchScratchFile(path = getQueryString('file')) {
// function fetchScratchFile(path = getQueryString('file') || './sb3/canu_v.1.0.0.sb3') {
// function fetchScratchFile(path = getQueryString('file') || './sb3/Icanhelp.sb3') {
function fetchScratchFile(path = getQueryString('file') || './sb3/jsbridge.sb3') {
    window.__bbfs_scratch['FETCH_SB3'] = +new Date();
    console.log('[current sb3 path is: ]', path);
    beforeSwitchProject();
    axios.get(path, {
        responseType: 'blob'
    })
        .then((res) => {
            console.log(res);
            window.__bbfs_scratch['FETCHED_SB3'] = +new Date();
            window.__bbfs_scratch['FETCH_SB3_DURATION'] = window.__bbfs_scratch['FETCHED_SB3'] - window.__bbfs_scratch['FETCH_SB3'];
            bar1.set(60);
            readFromSb(res.data)
        })
}

window.addEventListener('load', function () {
    window.__bbfs_scratch['LOAD'] = +new Date();
    bridgeRegisterHandler();
    attachMouseEvents(canvas);
    fetchScratchFile();
})

window.addEventListener('unLoad', function () {
    window.__bbfs_scratch['UNLOAD'] = +new Date();
    window.__bbfs_scratch['LOAD_DURATION'] = window.__bbfs_scratch['UNLOAD'] - window.__bbfs_scratch['LOAD'];
    window.__bbfs_scratch = null;
    detachMouseEvents(canvas);
})