// index.js


// 一些常量与数据
const app = getApp()	
const iot = require('../../utils/alibabacloud-iot-device-sdk.min.js');
const util = require('../../utils/util.js')
const deviceConfig = {
  productKey: "a1wTI7EqUpu",
  deviceName: "MyWechat",
  deviceSecret: "6eef8ea02fe0ed6fca01d6b2b427e9a1",
  regionId: "cn-shanghai",
  brokerUrl: 'wxs://a1wTI7EqUpu.iot-as-mqtt.cn-shanghai.aliyuncs.com'
 };
var device
Page({ // 页面初始化
  data: {
    Temperature: '0',
    Humidity: '0',
    Env_lux: '0',
    PM25: '0',
    CO2: '0',
    Buzzer: '0',
    deviceLog: '',
    deviceState: '',
 },
  // 设备上线 按钮点击事件
  online: function (e) {
    this.doConnect()
 },
  doConnect() {
    device=iot.device(deviceConfig)
  
    device.on('connect', () => {
       //订阅获取云端数据的topic  
      device.subscribe(`/sys/${deviceConfig.productKey}/${deviceConfig.deviceName}/thing/service/property/set`);
      console.log('connect successfully!');
      let dateTime = util.formatTime(new Date());
      this.setData({
      deviceState: dateTime + ' Connect!'
      })
       wx.showToast({
      title: 'Connect!',
      })
    });
    
       //消息监听
    device.on('message', (topic, payload) => {
        var obj= JSON.parse(payload);
        console.log('==received:\n',topic, payload.toString());
        
     /*
      下行格式
     {"method":"thing.service.property.set",
     "id":"228046399",
     "params":{
       "mlux":11712,
       "CurrentHumidity":69,
       "PM25":37,
       "CurrentTemperature":36,
       "CO2":1053,
       "Buzzer":1},
       "version":"1.0.0"}
      */
      
        if(payload.indexOf('set') > 0 ){
            this.setData({
              Humidity: obj.params.CurrentHumidity,
              Temperature: obj.params.CurrentTemperature,
              Env_lux: obj.params.mlux,
              PM25:obj.params.PM25,
              CO2:obj.params.CO2,
              Buzzer:obj.params.Buzzer
          })
    
    
        }
    });   

  

      
     
 },
 //发送数据给云端
 send:function(){
   const topic=`/sys/a1wTI7EqUpu/${deviceConfig.deviceName}/thing/event/property/post`;
   device.publish(topic, this.getPostData(topic));
 },
 // 设备下线 按钮点击事件
 offline: function () {
  device.end()
   console.log('disconnect successfully!');
   let dateTime = util.formatTime(new Date());
   this.setData({
   deviceState: dateTime + ' Disconnect!'
   })
    wx.showToast({
   title: 'Disconnect!',
   })

},

// 生成上传的设备属性
  getPostData(topic){
    const payloadJson = {
      method: topic,
      id: Date.now(),
      params: {
        // Math.round(Math.random()*(y-x)+x)
        CurrentTemperature: Math.floor(Math.random() * (40-10) + 10), // -40 ~ 123
        CurrentHumidity: Math.floor((Math.random() * (80-20)) + 20), // 0 ~ 100
        CO2:Math.floor(Math.random()*(6000)+0) , // 0 ~ 6000 ppm
        Buzzer: Math.round(Math.random()), // 0 1
        mlux: Math.round(Math.random()*(30000-500)+500), // 0 ~ 0 ~ 65000
        PM25: Math.round(Math.random()*(100-80)+20) //0 ~ 400
      }
  }
  console.log("===postData\n topic=" + topic)
  console.log(payloadJson)
  return JSON.stringify(payloadJson);
  }
})
