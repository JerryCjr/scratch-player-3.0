function setupWebViewJavascriptBridge(callback) {
    if (window.WebViewJavascriptBridge) {
        return callback(WebViewJavascriptBridge);
    }
    if (window.WVJBCallbacks) {
        return window.WVJBCallbacks.push(callback);
    }
    window.WVJBCallbacks = [callback];
    var WVJBIframe = document.createElement('iframe');
    WVJBIframe.style.display = 'none';
    WVJBIframe.src = 'https://__bridge_loaded__';
    document.documentElement.appendChild(WVJBIframe);
    setTimeout(function () {
        document.documentElement.removeChild(WVJBIframe)
    }, 0)
}

// in app
if (window.navigator.userAgent.indexOf('babyfs') > -1) {
    setupWebViewJavascriptBridge(function (bridge) {
        var uniqueId = 1

        function log(message, data) {
            var log = document.getElementById('log')
            var el = document.createElement('div')
            el.className = 'logLine'
            el.innerHTML = uniqueId++ + '. ' + message + ':<br/>' + JSON.stringify(data)
            if (log.children.length) {
                log.insertBefore(el, log.children[0])
            } else {
                log.appendChild(el)
            }
        }
        bridge.callHandler('setScreenHoriz', function (responseData) { })
    })
    if (window.android_native) {
        window.android_native.setScreenHoriz();
    }
}