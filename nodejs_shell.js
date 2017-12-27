const express = require('express');
const http = require('http').Server(express);
const io = require('socket.io')(http);
const dateUtil = require('date-utils');
const CSV = require('csvtojson').Converter;
const StatsD = require('hot-shots');
const exec = require('child_process').exec;
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

    const tags = [
        `gpus:${gpu.count}`,
        `name:${gpu.name}`,
        `driver:${gpu.driver_version}`,
        `uuid:${gpu.uuid}`
    ];

    if(gpu.display_mode !== ''){
        tags.push(
            `screen_connected:${gpu.display_mode}`,
            `screen_active:${gpu.display_active}`
        );
    }

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
    // Client.gauge('fan', gpu['fan.speed [%]'], tags);
    // Client.gauge('pstate', gpu.pstate.replace('P',''), tags);
    // Client.gauge('pcie.generation', gpu['pcie.link.gen.current'], tags);
    // Client.gauge('pcie.speed', gpu['pcie.link.width.current'], tags);
    // Client.gauge('memory.used', gpuUsed, tags);
    // Client.gauge('memory.free', gpu['memory.free [MiB]'].replace(' MiB',''), tags);
    // Client.gauge('memory.total', gpuTotal, tags);
    // Client.gauge('memory.pct', percentUsed, tags);
    // Client.gauge('utilization', gpu['utilization.gpu [%]'].replace(' %',''), tags);
    // Client.gauge('temperature.celsius', gpu['temperature.gpu'], tags);
    // Client.gauge('temperature.fahrenheit', (gpu['temperature.gpu'] * 1.8 + 32).toFixed(0), tags);
    // Client.gauge('watts', gpu['power.draw [W]'].replace(' W',''), tags);
    // Client.gauge('clock.shader', gpu['clocks.current.graphics [MHz]'].replace(' MHz',''), tags);
    // Client.gauge('clock.streaming', gpu['clocks.current.sm [MHz]'].replace(' MHz',''), tags);
    // Client.gauge('clock.memory', gpu['clocks.current.memory [MHz]'].replace(' MHz',''), tags);
    // Client.gauge('clock.encoder', gpu['clocks.current.video [MHz]'].replace(' MHz',''), tags);
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
                    arr = arr.trim();
                    arr = arr.split(/\s+/);
                    
                    var query3 = `ps -o user= -p ` + arr[1];
                    exec(query3, (err, result) => {
                        if(err){
                        } else {
                            global.dataString += "gpu0 : " + result;

                            
                        }
                    });

                    var query3 = `ps -o user= -p ` + arr[9];
                    exec(query3, (err, result) => {
                        if(err){
                        } else {
                            global.dataString += "gpu1 : " + result;

                            
                        }
                    });

                    var query3 = `ps -o user= -p ` + arr[17];
                    exec(query3, (err, result) => {
                        if(err){
                        } else {
                            global.dataString += "gpu2 : " + result;

                            
                        }
                    });

                    var query3 = `ps -o user= -p ` + arr[25];
                    exec(query3, (err, result) => {
                        if(err){
                        } else {
                            global.dataString += "gpu3 : " + result;
                        }
                    });
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
        
    }
});