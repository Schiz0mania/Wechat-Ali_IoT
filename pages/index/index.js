// index.js

// 一些常量与数据
const app = getApp()	
var mqtt = require('../../utils/mqtt.min.js')
const crypto = require('../../utils/hex_hmac_sha1.js')
const util = require('../../utils/util.js')
var client
const deviceConfig = {
  productKey: "a1wTI7EqUpu",
  deviceName: "MyWechat",
  deviceSecret: "6db197247728cf30388f6bdc81aeed9b",
  regionId: "cn-shanghai"
 };

Page({ // 页面初始化
  data: {
    Temperature: '0',
    Humidity: '0',

    deviceLog: '',
    deviceState: ''
 },
  // 设备上线 按钮点击事件
  online: function (e) {
    this.doConnect()
 },
  doConnect() {
    var that = this;
    const options = this.initMqttOptions(deviceConfig);
    console.log(options)
    //wxs://{productKey}.iot-as-mqtt.{regionId}.aliyuncs.com
    client = mqtt.connect('wxs://a1wTI7EqUpu.iot-as-mqtt.cn-shanghai.aliyuncs.com', options)
    client.on('connect', function () {
      console.log('连接服务器成功')
      let dateTime = util.formatTime(new Date());
      that.setData({
        deviceState: dateTime + ' Connect Success!'
     })
     wx.showToast({
       title: 'Connect Success!',
     })
     //订阅，获取云端数据的topic

     client.subscribe(`/sys/a1wTI7EqUpu/${deviceConfig.deviceName}/thing/service/property/set`,function(err){
      if(! err){
        console.log("sub succeed!");
      }
      
     })
     //接收消息监听
    client.on('message', function (topic, message) {
      // message is Buffer
      let msg = message.toString();
      console.log(topic+'收到消息：'+msg);

      /*
      下行格式
      {"method":"thing.service.property.set",
      "id":"305516842",
      "params":{"CurrentHumidity":12,"CurrentTemperature":23,"Buzzer":0},
      "version":"1.0.0"}
      */
      var obj= JSON.parse(message);
      that.setData({
        Humidity: obj.params.CurrentHumidity,
        Temperature: obj.params.CurrentTemperature
      })
      
    })
   })

 },
 //发送数据给云端
 send:function(){
   const topic=`/sys/a1wTI7EqUpu/${deviceConfig.deviceName}/thing/event/property/post`;

  client.publish(topic,this.getPostData(topic),{qos:1})


 },
 // 设备下线 按钮点击事件
 offline: function () {
  var that = this;
  client.end()  // 关闭连接
  console.log('服务器连接断开')
  let dateTime = util.formatTime(new Date());
  that.setData({
    deviceState: dateTime + ' Disconnect!'
 })
 wx.showToast({
  title: 'Disconnect!',
})
},
// 生成上传的设备属性
  getPostData(topic){
    const payloadJson = {
      id: Date.now(),
      params: {
        CurrentTemperature: Math.floor((Math.random() * 20) + 10),
        CurrentHumidity: Math.floor((Math.random() * 20) + 60),
      },
      method: "thing.event.property.post"
  }

  console.log("===postData\n topic=" + topic)
  console.log(payloadJson)

  return JSON.stringify(payloadJson);
  },


  //IoT平台mqtt连接参数初始化
  initMqttOptions(deviceConfig) {
    const params = {
      productKey: deviceConfig.productKey,
      deviceName: deviceConfig.deviceName,
      timestamp: Date.now(),
      clientId: Math.random().toString(36).substr(2),
   }
    //CONNECT参数
    const options = {
      keepalive: 60, //60s
      clean: true, //cleanSession不保持持久会话
      protocolVersion: 4 //MQTT v3.1.1
   }
    //1.生成clientId，username，password
    options.password = this.signHmacSha1(params, deviceConfig.deviceSecret);
    options.clientId = `${params.clientId}|securemode=2,signmethod=hmacsha1,timestamp=${params.timestamp}|`;
    options.username = `${params.deviceName}&${params.productKey}`;
 
    return options;
 },
  /*
   生成基于HmacSha1的password
   参考文档：https://help.aliyun.com/document_detail/73742.html?#h2-url-1
 */
  signHmacSha1(params, deviceSecret) {
    let keys = Object.keys(params).sort();
    // 按字典序排序
    keys = keys.sort();
    const list = [];
    keys.map((key) => {
      list.push(`${key}${params[key]}`);
   });
    const contentStr = list.join('');
    return crypto.hex_hmac_sha1(deviceSecret, contentStr);
 }
})
