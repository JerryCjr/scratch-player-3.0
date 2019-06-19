/* eslint-disable no-undef */
// import regeneratorRuntime from './lib/runtime';
import bindAll from 'lodash.bindall';
import React from 'react';
import ajax from "axios";
import VM from 'scratch-vm';
import Storage from 'scratch-storage';
import Renderer from 'scratch-render';
import AudioEngine from 'scratch-audio';
import { SVGRenderer as V2SVGAdapter } from 'scratch-svg-renderer';
import { BitmapAdapter as V2BitmapAdapter } from 'scratch-svg-renderer';
import { getEventXY } from './lib/touch-utils.js'

const dragThreshold = 3; // Same as the block drag threshold
window.devicePixelRatio = 3;
class Player extends React.Component {
  constructor(pros) {
    super(pros);
    bindAll(this, [
      'attachMouseEvents',
      'cancelMouseDownTimeout',
      'detachMouseEvents',
      'handleDoubleClick',
      'handleQuestionAnswered',
      'onMouseUp',
      'onMouseMove',
      'onMouseDown',
      'onStartDrag',
      'onStopDrag',
      'onWheel',
      'updateRect',
      'questionListener',
      'clearDragCanvas',
      'drawDragCanvas',
      'positionDragCanvas'
    ]);
    this.state = {
      scratchData: null,
      mouseDownTimeoutId: null,
      mouseDownPosition: null,
      isDragging: false,
      dragOffset: null,
      dragId: null,
      colorInfo: null,
      question: null
    };

    this.canvas = document.createElement('canvas');
    this.renderer = new Renderer(this.canvas);
    this.storage = new Storage();
    this.audio = new AudioEngine();
    this.vm = new VM();
    this.vm.attachStorage(this.storage)
    this.vm.attachRenderer(this.renderer);
    this.vm.attachAudioEngine(this.audio);
    this.vm.renderer.draw();
    this.vm.attachV2SVGAdapter(new V2SVGAdapter());
    this.vm.attachV2BitmapAdapter(new V2BitmapAdapter());
  }
  async componentDidMount() {
    // this.canvas = document.getElementById('ocanvas');
    // this.renderer = new Renderer(this.canvas);
    // this.storage = new Storage();
    // this.audio = new AudioEngine();
    // this.vm = new VM();
    // this.vm.attachStorage(this.storage)
    // this.vm.attachRenderer(this.renderer);
    // this.vm.attachAudioEngine(this.audio);
    // this.vm.renderer.draw();
    // this.vm.attachV2SVGAdapter(new V2SVGAdapter());
    // this.vm.attachV2BitmapAdapter(new V2BitmapAdapter());
    document.querySelector('#container').appendChild(this.canvas)
    let r;
    r = await ajax.get('http://pspkamwf3.bkt.clouddn.com/Party%20dodge%21%20%28contest%20entry%29%20%281%29.sb3', { responseType: 'blob' });
    if (r && r.data) {
      this.setState({
        scratchData: r.data
      })
    }
    let reader = new FileReader();
    reader.onload = () => {
      // console.log(reader.result);
      this.vm.start();
      this.vm.loadProject(reader.result)
        .then(() => {
          this.vm.greenFlag(); // 执行程序
        });
    };
    reader.readAsArrayBuffer(r.data);
    this.attachRectEvents();
    this.attachMouseEvents(this.canvas);
    this.updateRect();
  }
  shouldComponentUpdate(nextProps, nextState) {
    return this.props.stageSize !== nextProps.stageSize ||
      this.props.isColorPicking !== nextProps.isColorPicking ||
      this.state.colorInfo !== nextState.colorInfo ||
      this.props.isFullScreen !== nextProps.isFullScreen ||
      this.state.question !== nextState.question ||
      this.props.micIndicator !== nextProps.micIndicator ||
      this.props.isStarted !== nextProps.isStarted;
  }
  componentDidUpdate(prevProps) {
    this.updateRect();
    this.renderer.resize(this.rect.width, this.rect.height);
  }
  componentWillUnmount() {
    this.detachMouseEvents(this.canvas);
    this.detachRectEvents();
    this.vm.runtime.removeListener('QUESTION', this.questionListener);
  }
  questionListener(question) {
    this.setState({ question: question });
  }
  handleQuestionAnswered(answer) {
    this.setState({ question: null }, () => {
      this.vm.runtime.emit('ANSWER', answer);
    });
  }
  attachMouseEvents(canvas) {
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('touchmove', this.onMouseMove);
    document.addEventListener('touchend', this.onMouseUp);
    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('touchstart', this.onMouseDown);
    canvas.addEventListener('wheel', this.onWheel);
  }
  detachMouseEvents(canvas) {
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('touchmove', this.onMouseMove);
    document.removeEventListener('touchend', this.onMouseUp);
    canvas.removeEventListener('mousedown', this.onMouseDown);
    canvas.removeEventListener('touchstart', this.onMouseDown);
    canvas.removeEventListener('wheel', this.onWheel);
  }
  attachRectEvents() {
    window.addEventListener('resize', this.updateRect);
    window.addEventListener('scroll', this.updateRect);
  }
  detachRectEvents() {
    window.removeEventListener('resize', this.updateRect);
    window.removeEventListener('scroll', this.updateRect);
  }
  updateRect() {
    this.rect = this.canvas.getBoundingClientRect();
  }
  getScratchCoords(x, y) {
    const nativeSize = this.renderer.getNativeSize();
    return [
      (nativeSize[0] / this.rect.width) * (x - (this.rect.width / 2)),
      (nativeSize[1] / this.rect.height) * (y - (this.rect.height / 2))
    ];
  }
  getColorInfo(x, y) {
    return {
      x: x,
      y: y,
      ...this.renderer.extractColor(x, y, colorPickerRadius)
    };
  }
  handleDoubleClick(e) {
    const { x, y } = getEventXY(e);
    // Set editing target from cursor position, if clicking on a sprite.
    const mousePosition = [x - this.rect.left, y - this.rect.top];
    const drawableId = this.renderer.pick(mousePosition[0], mousePosition[1]);
    if (drawableId === null) return;
    const targetId = this.vm.getTargetIdForDrawableId(drawableId);
    if (targetId === null) return;
    this.vm.setEditingTarget(targetId);
  }
  onMouseMove(e) {
    const { x, y } = getEventXY(e);
    const mousePosition = [x - this.rect.left, y - this.rect.top];
    if (this.props.isColorPicking) {
      // Set the pickX/Y for the color picker loop to pick up
      this.pickX = mousePosition[0];
      this.pickY = mousePosition[1];
    }
    if (this.state.mouseDown && !this.state.isDragging) {
      const distanceFromMouseDown = Math.sqrt(
        Math.pow(mousePosition[0] - this.state.mouseDownPosition[0], 2) +
        Math.pow(mousePosition[1] - this.state.mouseDownPosition[1], 2)
      );
      if (distanceFromMouseDown > dragThreshold) {
        this.cancelMouseDownTimeout();
        this.onStartDrag(...this.state.mouseDownPosition);
      }
    }
    if (this.state.mouseDown && this.state.isDragging) {
      // Editor drag style only updates the drag canvas, does full update at the end of drag
      // Non-editor drag style just updates the sprite continuously.
      const spritePosition = this.getScratchCoords(mousePosition[0], mousePosition[1]);
      this.vm.postSpriteInfo({
        x: spritePosition[0] + this.state.dragOffset[0],
        y: -(spritePosition[1] + this.state.dragOffset[1]),
        force: true
      });
    }
    const coordinates = {
      x: mousePosition[0],
      y: mousePosition[1],
      canvasWidth: this.rect.width,
      canvasHeight: this.rect.height
    };
    this.vm.postIOData('mouse', coordinates);
  }
  onMouseUp(e) {
    const { x, y } = getEventXY(e);
    const mousePosition = [x - this.rect.left, y - this.rect.top];
    this.cancelMouseDownTimeout();
    this.setState({
      mouseDown: false,
      mouseDownPosition: null
    });
    const data = {
      isDown: false,
      x: x - this.rect.left,
      y: y - this.rect.top,
      canvasWidth: this.rect.width,
      canvasHeight: this.rect.height,
      wasDragged: this.state.isDragging
    };
    if (this.state.isDragging) {
      this.onStopDrag(mousePosition[0], mousePosition[1]);
    }
    this.vm.postIOData('mouse', data);
    if (this.props.isColorPicking &&
      mousePosition[0] > 0 && mousePosition[0] < this.rect.width &&
      mousePosition[1] > 0 && mousePosition[1] < this.rect.height
    ) {
      const { r, g, b } = this.state.colorInfo.color;
      const componentToString = c => {
        const hex = c.toString(16);
        return hex.length === 1 ? `0${hex}` : hex;
      };
      const colorString = `#${componentToString(r)}${componentToString(g)}${componentToString(b)}`;
      this.props.onDeactivateColorPicker(colorString);
      this.setState({ colorInfo: null });
      this.pickX = null;
      this.pickY = null;
    }
  }
  onMouseDown(e) {
    this.updateRect();
    const { x, y } = getEventXY(e);
    const mousePosition = [x - this.rect.left, y - this.rect.top];
    if (this.props.isColorPicking) {
      // Set the pickX/Y for the color picker loop to pick up
      this.pickX = mousePosition[0];
      this.pickY = mousePosition[1];
      // Immediately update the color picker info
      this.setState({ colorInfo: this.getColorInfo(this.pickX, this.pickY) });
    } else {
      if (e.button === 0 || (window.TouchEvent && e instanceof TouchEvent)) {
        this.setState({
          mouseDown: true,
          mouseDownPosition: mousePosition,
          mouseDownTimeoutId: setTimeout(
            this.onStartDrag.bind(this, mousePosition[0], mousePosition[1]),
            400
          )
        });
      }
      const data = {
        isDown: true,
        x: mousePosition[0],
        y: mousePosition[1],
        canvasWidth: this.rect.width,
        canvasHeight: this.rect.height
      };
      this.vm.postIOData('mouse', data);
      if (e.preventDefault) {
        // Prevent default to prevent touch from dragging page
        e.preventDefault();
        // But we do want any active input to be blurred
        if (document.activeElement && document.activeElement.blur) {
          document.activeElement.blur();
        }
      }
    }
  }
  onWheel(e) {
    const data = {
      deltaX: e.deltaX,
      deltaY: e.deltaY
    };
    this.vm.postIOData('mouseWheel', data);
  }
  cancelMouseDownTimeout() {
    if (this.state.mouseDownTimeoutId !== null) {
      clearTimeout(this.state.mouseDownTimeoutId);
    }
    this.setState({ mouseDownTimeoutId: null });
  }
  drawDragCanvas(drawableData) {
    const {
      data,
      width,
      height,
      x,
      y
    } = drawableData;
    this.canvas.width = width;
    this.canvas.height = height;
    // Need to convert uint8array from WebGL readPixels into Uint8ClampedArray
    // for ImageData constructor. Shares underlying buffer, so it is fast.
    const imageData = new ImageData(
      new Uint8ClampedArray(data.buffer), width, height);
    this.canvas.getContext('2d').putImageData(imageData, 0, 0);
    // Position so that pick location is at (0, 0) so that positionDragCanvas()
    // can use translation to move to mouse position smoothly.
    this.canvas.style.left = `${-x}px`;
    this.canvas.style.top = `${-y}px`;
    this.canvas.style.display = 'block';
  }
  clearDragCanvas() {
    this.canvas.width = this.canvas.height = 0;
    this.canvas.style.display = 'none';
  }
  positionDragCanvas(mouseX, mouseY) {
    // mouseX/Y are relative to stage top/left, and dragCanvas is already
    // positioned so that the pick location is at (0,0).
    this.canvas.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
  }
  onStartDrag(x, y) {
    if (this.state.dragId) return;
    const drawableId = this.renderer.pick(x, y);
    if (drawableId === null) return;
    const targetId = this.vm.getTargetIdForDrawableId(drawableId);
    if (targetId === null) return;
    const target = this.vm.runtime.getTargetById(targetId);
    // Do not start drag unless in editor drag mode or target is draggable
    if (!target.draggable) return;
    // Dragging always brings the target to the front
    target.goToFront();
    // Extract the drawable art
    const drawableData = this.renderer.extractDrawable(drawableId, x, y);
    this.vm.startDrag(targetId);
    this.setState({
      isDragging: true,
      dragId: targetId,
      dragOffset: drawableData.scratchOffset
    });
  }
  onStopDrag(mouseX, mouseY) {
    const dragId = this.state.dragId;
    const commonStopDragActions = () => {
      this.vm.stopDrag(dragId);
      this.setState({
        isDragging: false,
        dragOffset: null,
        dragId: null
      });
    };
    commonStopDragActions();
  }
  render() {
    return (
      <div id="container">
      <canvas id="ocanvas"></canvas>
      </div>
    );
  }
}
export default Player;
