import test from 'node:test';
import assert from 'node:assert/strict';
import {robotPose,SHOULDER,SOURCE,DESTINATION,UPPER_LENGTH,FOREARM_LENGTH,sub,length,ROLLER_RADIUS,ROLLER_CENTER_Y,BOARD_THICKNESS,CONVEYOR_START,rollerAngle} from '../lib/robotics/motion';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} must equal ${b}`);
test('robot keeps both mechanical link lengths fixed through the full cycle',()=>{
 for(let t=0;t<12;t+=.025){const pose=robotPose(t);close(length(sub(pose.elbow,SHOULDER)),UPPER_LENGTH);close(length(sub(pose.wrist,pose.elbow)),FOREARM_LENGTH);for(const n of [...pose.tcp,...pose.elbow,...pose.wrist])assert.ok(Number.isFinite(n));}
});
test('gripper closes on the source before the board is lifted',()=>{const before=robotPose(2),gripped=robotPose(2.2),lifted=robotPose(2.7);assert.equal(before.held,false);assert.deepEqual(gripped.tcp,SOURCE);assert.equal(gripped.grip,1);assert.equal(gripped.held,true);assert.deepEqual(lifted.board,lifted.tcp);assert.ok(lifted.tcp[1]>SOURCE[1]);});
test('board is released on the destination before the arm retracts',()=>{const placed=robotPose(6.95),retracted=robotPose(7.7);assert.equal(placed.held,false);assert.deepEqual(placed.board,DESTINATION);assert.deepEqual(placed.tcp,DESTINATION);assert.equal(retracted.grip,0);assert.ok(retracted.tcp[1]>DESTINATION[1]);close(retracted.board![1],DESTINATION[1]);});
test('robot loop returns to the same pose without changing joint lengths',()=>{assert.deepEqual(robotPose(0),robotPose(12));assert.deepEqual(robotPose(.5),robotPose(12.5));});
test('board rests on roller crowns and travels at their surface speed after the gripper opens',()=>{
 for(let t=CONVEYOR_START;t<9.9;t+=.05){
  const a=robotPose(t),b=robotPose(t+.025);
  close(a.board![1]-BOARD_THICKNESS/2,ROLLER_CENTER_Y+ROLLER_RADIUS);
  close(b.board![0]-a.board![0],-ROLLER_RADIUS*(rollerAngle(t+.025)-rollerAngle(t)));
  assert.equal(a.grip,0);assert.equal(a.held,false);
  assert.ok(a.board![0]+.24<=2.6+ROLLER_RADIUS,'board remains supported before removal');
 }
});
test('rollers keep the same drive speed through picking, placing and the cycle boundary',()=>{
 for(const t of [0,1.6,3.5,6.9,7.25,10.5,11.99,12,12.01]){
  close(rollerAngle(t+.01)-rollerAngle(t),rollerAngle(.01));
  assert.ok(rollerAngle(t+.01)<rollerAngle(t),'roller crowns move toward positive x');
 }
});
