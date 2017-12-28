const express = require('express');
const plotly = require('plotly')('onaries', 'fKMXvNNHAMPJyHDaoXXH');
const http = require('http').Server(express);
const io = require('socket.io')(http);
const util = require('util');
const push = require('push.js');
const dateUtil = require('date-utils');
const CSV = require('csvtojson').Converter;
const StatsD = require('hot-shots');
const exec = require('child_process').exec;
const execSync = require('child_process').execSync;
const params = [
    'index',
    'name',
    'pcie.link.width.current',
    'pcie.link.gen.current',
    'display_mode',
    'display_active',
    'driver_version',
    'uuid',
    'fan.speed',
    'pstate',
    'memory.total',
    'memory.used',
    'memory.free',
    'utilization.gpu',
    'temperature.gpu',
    'power.draw',
    'clocks.gr',
    'clocks.sm',
    'clocks.mem',
    'clocks.video'
].join(',');
const query = `nvidia-smi --format=csv --query-gpu=${params}`;
const query2 = `nvidia-smi pmon -c 1`;
var app = express();
var server = app.listen(8088, function(){
    console.log("Express server has started on port 8088")
});

var initData = [{x:[], y:[], stream:{token:'884y57pb97', maxpoints:200}}];
var initGraphOptions = {fileopt : "extend", filename : "nodenodenode"};

function reportGpuStats(gpu){
    const gpuNum = parseInt(gpu['index'],10);
    const gpuName = gpu['name'];
    const gpuUsed = parseInt(gpu['memory.used [MiB]'].replace(' MiB',''),10);
    const gpuTotal = parseInt(gpu['memory.total [MiB]'].replace(' MiB',''),10);
    const percentUsed = (gpuUsed / gpuTotal * 100).toFixed(2);
    const gpuWatt = parseInt(gpu['power.draw [W]'].replace(' W',''), 10);
    const gpuFanSpeed = parseInt(gpu['fan.speed [%]'],10);
    const gpuUtilization = parseInt(gpu['utilization.gpu [%]'].replace(' %',''),10)
    const gpuTemperature = parseInt(gpu['temperature.gpu'], 10)

    var availability = "unavailable";
    // 사용 가능한지 확인
    if (gpuUtilization < 10 && percentUsed < 60){
        var availability = "available";
    }

    global.dataString += "<b>gpu" + gpuNum + " : " + gpuName + '</b><br/>';
    global.dataString +=  "availability : " + availability + '<br/>';
    global.dataString += "used : " + gpuUsed + 'MB <br/>';
    global.dataString += "total : " + gpuTotal + 'MB <br/>';
    global.dataString += "percent : " + percentUsed + '<br/>';
    global.dataString += "watt : " + gpuWatt + 'W <br/>';
    global.dataString += "temp : " + gpuTemperature + '℃ <br/>';
    global.dataString += "fan speed : " + gpuFanSpeed + '% <br/>';
    global.dataString += "utilization : " + gpuUtilization + '% <p></p>';

    console.log("gpu" + gpuNum);
    console.log("used : " + gpuUsed);
    console.log("total : " + gpuTotal);
    console.log("percent : " + percentUsed);
}

function parseData(data,next){
    const Parser = new CSV({
        flatKeys: true
    });

    Parser.fromString(data,(err,result) =>{
        if(err){
            logger.error({err},'Failed to parse CSV output');
            console.log(data);
        } else {
            result.forEach((gpu) =>{
                // Set unsupported returns to an empty string for simplicity
                for(const key in gpu){
                    if(gpu.hasOwnProperty(key)){
                        const value = gpu[key];
                        if(value === '[Not Supported]'){
                            gpu[key] = '';
                        } else {
                            if(value === 'Enabled'){
                                gpu[key] = true;
                            } else if(value === 'Disabled'){
                                gpu[key] = false;
                            }
                        }
                    }
                }

                next(gpu);
            });
        }
        global.dataString += "<script>function refresh() { setTimeout(function () { window.location.reload() }, 10000); }; refresh()</script>";

        app.get('/', function(req, res){
            res.send(global.dataString);
        });
        
    });
}

function queryGpus(){
    exec(query,(err,result) =>{
        if(err){

        } else {
            
            var newDate = new Date();
            var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
            console.log('--------------------------------------');
            console.log(time);
            global.dataString = "";
            global.dataString += time + '<br/>'

            exec(query2,(err,result) => {
                if(err){

                }
                else {

                    var arr = result.slice(105);
                    var arr2 = arr.trim();
                    arr2 = arr2.split(/\s+/);
                    global.dataString += "<b> GPU Process </b></br>";
                    
                    for (var j = 0; j < arr.split('\n').length - 1; j++){

                        var gpuIndex = arr2[j*8];
                        var pid = arr2[j*8+1];
                        var pname = arr2[j*8+7];

                        var query3 = 'ps -o user= -p ' + pid;

                        
                        if (!isNaN(parseInt(pid))){
                            
                            // console.log(query3);
                            var result2 = execSync(query3).toString();
                            // console.log(result2);
                            global.dataString += "gpu" + gpuIndex + " : " + result2 + "| pid : " + pid + " | process : " + pname + '</br>';
                        }
                    }                    
                }       
            });    
            parseData(result,reportGpuStats);

        }
    });

    
}

exec('nvidia-smi',(err) =>{
    if(err){
        throw new Error('nVidia SMI is not available, verify that it is part of your PATH environment variable');
    } else {
        global.dataString = "";
        console.log('nVidia SMI found, beginning loop and reporting');
        setInterval(queryGpus,10000);
        queryGpus();
        // plotly 그래프
        plotly.plot(initData, initGraphOptions, function (err, msg) {
          if (err) return console.log(err)
          console.log(msg);

        // 그래프 스트리밍
        //   var stream1 = plotly.stream('884y57pb97', function (err, res) {
        //     console.log(err, res);
        //     clearInterval(loop); // once stream is closed, stop writing
        //   });

        //   var i = 0;
        //   var loop = setInterval(function () {
        //       var streamObject = JSON.stringify({ x : i, y : i });
        //       stream1.write(streamObject+'\n');
        //       i++;
        //   }, 1000);
        });
    }
});