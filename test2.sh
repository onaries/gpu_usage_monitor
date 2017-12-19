#/bin/bash

hostname=$(hostname)
now=$(date)
gpu_usage=`nvidia-smi | grep "8112MiB"`
gpu_memory=${gpu_usage:35:5}
gpu_util=${gpu_usage:60:3}

# GPU가 사용중이지 않을 경우
#if [[ $gpu_usage == *"No running processes found"* ]]; then
#	message='available'
#else
#	message='unavailable'
#fi
#
if [ $gpu_memory -lt 2048 ] && [ $gpu_util -lt 30 ]; then
    message="available"
else
    message="unavailable"
fi

user=`nvidia-smi | grep "anaconda3"`
user_name=${user:48:3}
if [[ -z $user_name ]]; then
	username=$(whoami)
elif [ $user_name == "kyw" ]; then
	username="Yeonwoo"
elif [ $user_name == "dls" ]; then
	username="Seonwoo"
fi

last_user=`lastlog -u gpu2`
last_user=(${last_user// / })
echo ${last_user[6]}
if [[ ${last_user[6]} == "168.131.153.28" ]]; then
  echo "김연우"
elif [[ ${last_user[6]} == "168.131.153.44" ]]; then
  echo "김선우"
elif [[ ${last_user[6]} == "168.131.153.37" ]]; then
  echo "김선국"
elif [[ ${last_user[6]} == "168.131.153.32" ]]; then
  echo "한세영"
else
  echo "알수없음"
fi

# gpu 사용 프로세스 확인
gpu_process=`nvidia-smi pmon -c 1 | grep miner`
gpu_process=(${gpu_process// / })
echo ${gpu_process[1]}
echo ${gpu_process[3]}

# 50% 이상 사용중일 경우
if [[ ${gpu_process[3]} -gt 50 ]]; then
  echo "사용중"
fi

# GPU가 사용중이지 않을 경우
#if [[ $gpu_usage == *"No running processes found"* ]]; then
#	message='available'
#else
#	message='unavailable'
#fi
nvidia_info=`nvidia-smi`
pid=${nvidia_info:1162:6}
if [[ $pid =~ '^[0-9]+$' ]]; then
    ltime=`ps -p $pid -o etimes`
    lltime=${ltime:7}
    day=$((lltime/86400))
    hour=$((lltime/3600%24))
    minute=$((lltime/60%60))
    second=$((lltime%60))

    ptime=`date -d "$day days ago $hour hour ago $minute minute ago $second second ago" +"%Y/%m/%d %H:%M"`
else
    ptime=`date +"%Y/%m/%d %H:%M"`
fi

ptime=`date -d "$day days ago $hour hour ago $minute minute ago $second second ago" +"%Y/%m/%d %H:%M"`

new_message="$now \n\nuser : $username \nhostname : $hostname \nstatus : $message\nstart : $ptime"
echo -e $new_message
