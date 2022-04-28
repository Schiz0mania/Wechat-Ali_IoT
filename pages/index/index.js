// index.js

// 一些常量与数据
var mqtt = require('../../utils/mqtt.min.js')
const crypto = require('../../utils/hex_hmac_sha1.js')
const util = require('../../utils/util.js')
var client
const deviceConfig = {
  productKey: "a1Ym8pbipNn",
  deviceName: "MyWechat",
  deviceSecret: "ebbc743a8d884f3d583abf5fb4b1de3d",
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
    client = mqtt.connect('wxs://a1Ym8pbipNn.iot-as-mqtt.cn-shanghai.aliyuncs.com', options)
    client.on('connect', function () {
      console.log('连接服务器成功')
      let dateTime = util.formatTime(new Date());
      that.setData({
        deviceState: dateTime + ' Connect Success!'
     })
     wx.showToast({
       title: 'Connect Success!',
     })
     //订阅测试主题，
     client.subscribe(`/${deviceConfig.productKey}/${deviceConfig.deviceName}/user/get`,function(err){
      if(! err){
        console.log("sub succeed!");
      }
     })
     //接收消息监听
    client.on('message', function (topic, message) {
      // message is Buffer
      let msg = message.toString();
      console.log(topic+'收到消息：'+msg);
     //关闭连接 client.end()
    })
   })

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
 },
 send:function(){
  client.publish(`/${deviceConfig.productKey}/${deviceConfig.deviceName}/user/update`,"caonima ")


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
})
