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
var isinit=true
Page({ // 页面初始化
  data: {
    Temperature: '0',
    Humidity: '0',
    Env_lux: '0',
    PM25: '0',
    CO2: '0',
    Buzzer: 0,
    deviceLog: '',
    deviceState: 0,
    Copy : '0',
    elements: [{
      title: '设备上线',
      name: 'online',
      color: 'orange',
      icon: 'upload'
    },
    {
      title: '设备下线',
      name: 'offline',
      color: 'orange',
      icon: 'down'
    },
    {
      title: '数据更新',
      name: 'send',
      color: 'orange',
      icon: 'new'
    },
    
  ],
 },
  // 设备上线 按钮点击事件
  online: function (e) {
    this.doConnect();
    this.PubData();
    
 },
 // 上线并更新数据
  doConnect() {
    device=iot.device(deviceConfig)
  
    device.on('connect', () => {
       //订阅获取云端数据的topic  
      device.subscribe(`/sys/${deviceConfig.productKey}/${deviceConfig.deviceName}/thing/service/property/set`);
      console.log('Connected');
      
      let dateTime = util.formatTime(new Date());
      this.setData({
      deviceState: 1
      })
       wx.showToast({
      title: 'Connect!',
      icon: 'success',
      })
    });
       //消息监听
    device.on('message', (topic, payload) => {
        var obj= JSON.parse(payload);
        console.log('==received:\n',topic, payload.toString());
     /*
      下行格式例子
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
     // 云端set与post事件并处理数据更新
        if(payload.indexOf('set') > 0 ||  payload.indexOf('property/post') > 0 ){
          this.refresh(obj.params);
          this.check(obj.params);
        }
    // 云端报警事件处理
        if(payload.indexOf('success') > 0){
          if(payload.indexOf('PM25_alarm') > 0){
            //this.BuzzerOn();
            wx.showModal({
              title: '提示',
              content: '当前环境PM2.5浓度过高，请注意！',
              success: function (res) {
                if (res.confirm) {
                  console.log('用户点击确定')
                } else {
                  console.log('用户点击取消')
                }
              }
            })
          }
          if(payload.indexOf('CO2') > 0){
            //this.BuzzerOn();
            wx.showModal({
            title: '提示',
            content: '当前环境CO2浓度过高，请注意！',
            success: function (res) {
              if (res.confirm) {
                console.log('用户点击确定')
              } else {
                console.log('用户点击取消')
              }
            }
          })
          }
        }
        
    });   
  
 },
 //发送数据给云端
 send:function(){
   if(this.data.deviceState == 1){
    this.PubData();
    wx.showToast({
    title: 'Send!',
    icon: 'success',
    })
   }else{
    wx.showToast({
      title: 'not Connented',
      icon: 'error',
      })
   }
   
 },
 // 设备下线 按钮点击事件
 offline: function () {
   if(this.data.deviceState == 1){
   // 清除数据显示
    device.end()
   console.log('disconnect successfully!');
   let dateTime = util.formatTime(new Date());
   this.setData({
    Temperature: '0',
    Humidity: '0',
    Env_lux: '0',
    PM25: '0',
    CO2: '0',
    Buzzer: 0,
    Copy:'0',
    deviceLog: '',
    deviceState: 0,
   })
   isinit=true;
    wx.showToast({
   title: 'Disconnect!',
   icon: 'success',
   })
  }else{
    wx.showToast({
      title: 'not Connented',
      icon: 'error',
      })
  }

},

// publish method:post
  PubData(){ 
  const topic=`/sys/${deviceConfig.productKey}/${deviceConfig.deviceName}/thing/event/property/post`;
  var dataPack;
    if(isinit){
      dataPack=this.getPostData(topic)
      isinit=false;
    }else{
       //提交数据后
       console.log('传送本地数据\n',topic);
      dataPack=this.packLoaclData(topic)
    }
    device.publish(topic, dataPack);
    console.log('punlish\n',topic);
},
  PubEvent(identifier){
    const topic=`/sys/${deviceConfig.productKey}/${deviceConfig.deviceName}/thing/event/${identifier}/post`;
    device.publish(topic, this.getPostEventData(topic));
  },

// 生成上传的事件参数
  getPostEventData(topic){
    let payloadJson = {
      method: topic,
      id: Date.now(),
      params: {
        Buzzer: Math.floor(1)
      }
  }
  if(topic.indexOf('PM25')>0){
    payloadJson.params.PM25=this.data.PM25;
  }else if(topic.indexOf('CO2')>0){
    payloadJson.params.CO2=this.data.CO2;
  }
  console.log("===postData\n topic=" + topic);
  console.log(payloadJson);
  this.refresh(payloadJson.params);
  return JSON.stringify(payloadJson);
  },
  // 生成上传的设备属性(随机)
  getPostData(topic){
    let payloadJson = {
      method: topic,
      id: Date.now(),
      params: {
        // Math.round(Math.random()*(y-x)+x)  --  露天场景
        CurrentTemperature: Math.floor(Math.random() * (35-10) + 10), // 10 ~ 35
        CurrentHumidity: Math.floor((Math.random() * (60-30)) + 30), // 30 ~ 60
        CO2:Math.floor(Math.random()*(1000-250)+250) , // 250 ~ 1000 ppm  >1250警报
        Buzzer: Math.floor(0), // 
        mlux: Math.round(Math.random()*(15000-1000)+1000), // 1000 ~ 15000
        PM25: Math.round(Math.random()*(70-20)+20) //20 ~ 70 >80报警
      }
  }
  console.log("===postData\n topic=" + topic)
  console.log(payloadJson)
  this.refresh(payloadJson.params);
  return JSON.stringify(payloadJson);
  },
  // 获得当前页面数据
  packLoaclData(topic){
    const payloadJson = {
      method: topic,
      id: Date.now(),
      params: {
        CurrentTemperature:Math.floor(this.data.Temperature), 
        CurrentHumidity: Math.floor(this.data.Humidity), 
        CO2:Math.floor(this.data.CO2) , 
        Buzzer: Math.floor(this.data.Buzzer), 
        mlux: Math.floor(this.data.Env_lux),
        PM25: Math.floor(this.data.PM25) 
      }
  }
  console.log("===postData\n topic=" + topic)
  console.log(payloadJson)
  this.refresh(payloadJson.params);
  return JSON.stringify(payloadJson);
  },

  //页面刷新
  refresh(params){
    var str=JSON.stringify(params);
    var CurrentHumidity,CurrentTemperature,mlux,PM25,CO2,Buzzer;
    // 判断数据包内容
    if(str.indexOf('CurrentHumidity') > 0 ){
       CurrentHumidity=params.CurrentHumidity;
    }else{
      CurrentHumidity=this.data.Humidity;
    }
    if(str.indexOf('CurrentTemperature') > 0 ){
       CurrentTemperature=params.CurrentTemperature;
    }else{
      CurrentTemperature=this.data.Temperature;
    }
    if(str.indexOf('mlux') > 0 ){
       mlux=params.mlux;
    }else{
      mlux=this.data.Env_lux;
    }
    if(str.indexOf('PM25') > 0 ){
       PM25=params.PM25;
    }else{
      PM25=this.data.PM25;
    }
    if(str.indexOf('CO2') > 0 ){
       CO2=params.CO2;
    }else{
      CO2=this.data.CO2;
    }
    if(str.indexOf('Buzzer') > 0 ){
       Buzzer=params.Buzzer;
    }else{
      Buzzer=this.data.Buzzer;
    }
    // 根据数据包内容修改页面
    this.setData({
      Humidity: CurrentHumidity,
      Temperature: CurrentTemperature,
      Env_lux: mlux,
      PM25: PM25,
      CO2: CO2,
      Buzzer: Buzzer
  })
  },
  //检查数据，是否超过警戒值
  check(params){
    var str=JSON.stringify(params)
    if(str.indexOf('PM25') > 0 ){
      if(params.PM25>80){
        this.PubEvent('PM25_alarm');
      }
    }
    if(str.indexOf('CO2') > 0 ){
      if(params.CO2>1250){
        this.PubEvent('CO2_alarm');
      }
    }


  },
//wxmld表单数据
  Report:function(e)
  {
    this.setData({
      Humidity: e.detail.value.humidity,
      Temperature: e.detail.value.temperature,
      Env_lux: e.detail.value.env_lux,
      PM25: e.detail.value.pm25,
      CO2: e.detail.value.co2,
      Buzzer: e.detail.value.buzzer
  })
  },

  copy()
  {
    this.setData({
      Copy :'1'
    })
  },
})

