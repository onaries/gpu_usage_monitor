const smi = require('node-nvidia-smi');
 
smi(function (err, data) {
 
  // handle errors 
  if (err) {
    console.warn(err);
    process.exit(1);
  }
 
  // display GPU information 
  // console.log(JSON.stringify(data, null, ' '));
   
  gpu_data = JSON.stringify(data, null, ' ');
  console.log(typeof(data.timestamp));
  console.log(typeof(gpu_data));
});