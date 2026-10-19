'use client';
import RobotScene from './RobotScene';
export default function RoboticsDemo({immersive=false}:{immersive?:boolean}){
 return <figure className={'robotics-demo'+(immersive?' robotics-demo--immersive':'')}><RobotScene immersive={immersive}/></figure>;
}
