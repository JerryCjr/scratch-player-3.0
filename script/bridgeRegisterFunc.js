function swipe(params) {
    const exportUrl = `${swipe}?direction=${params.direction}`;
    vm.runtime.emit('event_whenbroadcastreceived_shouldregisterjsbridge', {
        name: exportUrl
    });
}