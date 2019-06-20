import ajax from "axios";
import bindAll from 'lodash.bindall';
import React from 'react';
import VM from 'scratch-vm';
import Renderer from 'scratch-render';
import Storage from 'scratch-storage';
import AudioEngine from 'scratch-audio';
import { SVGRenderer as V2SVGAdapter } from 'scratch-svg-renderer';
import { BitmapAdapter as V2BitmapAdapter } from 'scratch-svg-renderer';
import './player.css'

class Player extends React.Component {
  constructor(props) {
    super(props);
    bindAll(this, [
      'attachMouseEvents'
    ])
    this.state = {
      oW: 667,
      oH: 375,
      mouseDownTimeoutId: null,
      mouseDownPosition: null,
      isDragging: false,
      dragOffset: null,
      dragId: null,
      colorInfo: null,
      question: null
    }

  }

  async componentDidMount() {
    this.canvas = document.getElementById('ocanvas');
    this.renderer = new Renderer(this.canvas);
    this.storage = new Storage();
    this.audio = new AudioEngine();
    this.vm = new VM();
    this.vm.attachStorage(this.storage)
    this.vm.attachRenderer(this.renderer);
    this.vm.attachAudioEngine(this.audio);
    this.vm.renderer.draw();
    console.log(V2SVGAdapter);
    console.log(V2BitmapAdapter);
    this.vm.attachV2SVGAdapter(new V2SVGAdapter());
    this.vm.attachV2BitmapAdapter(new V2BitmapAdapter());
    console.log(this.vm);

    let r;
    r = await ajax.get('http://pspkamwf3.bkt.clouddn.com/Icanhelp1.sb3', { responseType: 'blob' });
    if (r && r.data) {
      console.log(r);
      let reader = new FileReader();
      reader.onload = () => {
        console.log(reader.result);
        this.vm.start();
        this.vm.loadProject(reader.result)
          .then(() => {
            // this.vm.greenFlag(); // 执行程序
          });
      };
      reader.readAsArrayBuffer(r.data);
    }
  }

  updateRect() {
    this.rect = this.canvas.getBoundingClientRect();
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

  render() {
    return (
      <canvas
        id='ocanvas'
        ref="canvas"
        width={this.state.oW}
        height={this.state.oH}
      />
    )
  }
}

export default Player;
