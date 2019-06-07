import ajax from "axios";

export default async function () {
    await ajax.get('http://pspkamwf3.bkt.clouddn.com/scratch', { responseType: 'blob' })
}

