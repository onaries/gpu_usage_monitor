#/bin/bash

sleep 1
# 이전 상태 파일 읽기
file_read=`cat slack_status`

# GPU1에서의 값 읽기
gpu1_file=`cat /mnt/gpu2/slack_status`

hostname=$(hostname)
now=$(date)
gpu_usage=`nvidia-smi | grep "8112MiB"`
gpu_memory=${gpu_usage:35:5}
gpu_util=${gpu_usage:60:3}

# GPU가 사용중이지 않을 경우
#if [[ $gpu_usage == *"No running processes found"* ]]; then
#   message='available'
#else
#   message='unavailable'
#fi
#
process1=`nvidia-smi | grep python`
process2=`nvidia-smi | grep anaconda`
process1=(${process1// / })
process2=(${process2// / })

# 최근 사용자
last_user=$
last_user=(${last_user// / })
echo ${last_user[3]}

# python 이란 프로그램이 작동 중(GPU)
if [ $process1 ] && [ -z $process2 ]; then
    ptcommand=`ps -p ${process1[2]} -o etimes`
    lltime=${ptcommand:7}
    day=$((lltime/86400))
    hour=$((lltime/3600%24))
    minute=$((lltime/60%60))
    second=$((lltime%60))
    ptime=`date -d "$day days ago $hour hour ago $minute minute ago $second second ago" +"%Y/%m/%d %H:%M"`

# anaconda 프로그램이 작동 중 (GPU)
elif [ -z $process1 ] && [ $process2 ]; then
    ptcommand=`ps -p ${process2[2]} -o etimes`
    lltime=${ptcommand:7}
    day=$((lltime/86400))
    hour=$((lltime/3600%24))
    minute=$((lltime/60%60))
    second=$((lltime%60))
    ptime=`date -d "$day days ago $hour hour ago $minute minute ago $second second ago" +"%Y/%m/%d %H:%M"`

# 두 개다 작동 중 (GPU)
elif [ $process1 ] && [ $process2 ]; then
    ptcommand=`ps -p ${process2[2]} -o etimes`
    lltime=${ptcommand:7}
    day=$((lltime/86400))
    hour=$((lltime/3600%24))
    minute=$((lltime/60%60))
    second=$((lltime%60))
    ptime=`date -d "$day days ago $hour hour ago $minute minute ago $second second ago" +"%Y/%m/%d %H:%M"`
fi

user=`nvidia-smi | grep "anaconda3"`
user_name=${user:48:3}
if [[ -z $user_name ]]; then
    username=$(whoami)
elif [ $user_name == "kyw" ]; then
    username="Yeonwoo Kim"
elif [ $user_name == "dls" ]; then
    username="Seonwoo Kim"
elif [ $user_name == "sey" ]; then
    username="Seyeong Han"
else
    username=$(whoami)
fi

#if [ $gpu_memory -lt 2048 ] && [ $gpu_util -lt 30 ]; then
if [[ $gpu_memory -lt 2048 ]]; then
    message="available"
    new_message="\n***gpu2***\n\nstatus : $message"
else
    message="unavailable"
    new_message="\n***gpu2***\n\nstatus : $message \nuser : $username \nstart : $ptime"
fi

set -eu

#Incoming WebHooksのURL
WEBHOOKURL="https://hooks.slack.com/services/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"
#メッセージを保存する一時ファイル
MESSAGEFILE=$(mktemp)
trap "
rm ${MESSAGEFILE}
" 0

usage_exit() {
    echo "Usage: $0 [-m message] [-c channel] [-i icon] [-n botname]" 1>&2
    exit 0
}

while getopts c:i:n:m: opts
do
    case $opts in
        c)
            CHANNEL=$OPTARG
            ;;
        i)
            FACEICON=$OPTARG
            ;;
        n)
            BOTNAME=$OPTARG
            ;;
        m)
            MESSAGE=$OPTARG"\n"
            ;;
        \?)
            usage_exit
            ;;
    esac
done
#slack 送信チャンネル
CHANNEL=${CHANNEL:-"#test"}
#slack 送信名
BOTNAME=${BOTNAME:-"gpu-confirmer"}
#slack アイコン
FACEICON=${FACEICON:-":ghost:"}
#見出しとなるようなメッセージ
MESSAGE=${MESSAGE:-""}

WEBMESSAGE='```'`cat ${MESSAGEFILE}`'```'

new_message="==========================$gpu1_file\n$new_message\n==========================\n　 ∧_∧\n　( ･ω･)\n　｜⊃／(＿＿＿\n／└-(＿＿＿_／\n￣￣￣￣￣￣"

#Incoming WebHooks送信
if [[ $file_read == *"$new_message"* ]]; then
    echo "file same"
else
    curl -s -S -X POST --data-urlencode "payload={\"channel\": \"${CHANNEL}\", \"username\": \"${BOTNAME}\", \"icon_emoji\": \"${FACEICON}\", \"text\": \"${MESSAGE}${new_message}\" }" ${WEBHOOKURL} >/dev/null
fi
echo $new_message > slack_status
