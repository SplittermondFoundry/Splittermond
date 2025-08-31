export interface VirtualToken {
    name: string;
    startTick: number;
    interval: number;
    times: number;
    description: string;
    /** Path to the image file */
    img: string;
    level: number;
    statusId:string;
}