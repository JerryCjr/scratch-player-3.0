import React from 'react';
import ajax from "axios";
import VM from 'scratch-vm';
import Storage from 'scratch-storage';
import Renderer from 'scratch-render';
import './App.css';


class Player extends React.Component {
    constructor(pros) {
        super(pros);
        this.state = {
            scratchData: null
        };

        this.canvas = document.createElement('canvas');
        this.vm = new VM();
        this.renderer = new Renderer(this.canvas);
        this.storage = new Storage();

        this.vm.attachStorage(this.storage)
        // this.vm.attachRenderer(this.renderer);
        // this.vm.renderer.draw();
    }

    async componentDidMount() {
        document.querySelector('#container').appendChild(this.canvas)

        let r;
        r = await ajax.get('http://pspkamwf3.bkt.clouddn.com/scratch', { responseType: 'blob' });
        if (r && r.data) {
            this.setState({
                scratchData: r.data
            })
        }
        let reader = new FileReader();
        reader.onload = () => {
            console.log(reader.result);
            this.vm.start();
            this.vm.loadProject(reader.result)
                .then(() => {
                    console.log(1);
                    this.vm.greenFlag(); // 执行程序
                });
        };
        reader.readAsArrayBuffer(r.data);
    }

    componentDidUpdate() {
        console.log(this.state);
        console.log(this.vm);
    }

    render() {
        return (
            <div id="container"></div>
        );
    }
}

export default Player;


