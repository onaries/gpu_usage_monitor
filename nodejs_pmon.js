const exec = require('child_process').exec;

const query = `nvidia-smi pmon -c 1`;
const query2 = `nvidia-smi pmon -c 1`;
function queryGpus(){
    exec(query,(err,result) =>{
        if(err){

        } else {
            var arr = result.slice(105);
            arr2 = arr.trim();
            arr2 = arr2.split(/\s+/);
            // for (var i = 0; i < arr.length; i++){
            //     if (arr[i] == ''){
            //         delete arr[i];
            //         console.log(typeof(arr[i]));
            //     }

            //     if (arr[i] == undefined){
            //         arr.splice(i, 1);
            //     }
            console.log(arr2);
            console.log(arr.split('\n').length);
            // }
            // console.log(arr);
            console.log(arr2[33]);
            console.log(isNaN(parseInt(arr2[33].trim())));
            var j = 8;
            var query3 = 'ps -o user= -p ' + arr2[j*2+1];

            exec(query3, (err, result) => {
                if(err){
                    console.log(err);
                } else {
                    console.log(result.trim());
                }
            });
            //parseData(result,reportGpuStats);
            
        }
    });
}

queryGpus();