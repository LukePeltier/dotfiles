#!/usr/bin/env bash

EXCEPTIONS=('cafecoredev' 'cafe3' 'cafedev' 'cafebeta' 'atv' 'atv3' 'rogue7' 'rogue5' 'suncrusher' 'zeus' 'l1houbuild01' 'l1da03' 'l1da02')
USER=('cafecoredev' 'rogue7' 'rogue5')
array_contains()
{
   local -r needle="$1"
   shift
   local -ra haystack=("$@")

   local item
   for item in "${haystack[@]}"
   do
      if [[ "$item" == "$needle" ]]
      then
         return 0
      fi
   done

   return 1
}

if [ "$#" -ne 1 ]; then
   echo "Usage: $0 shorthostname"
   exit 1
fi

HOST=$1
DOMAIN="hou.lab.pmc-sierra.bc.ca"
USERNAME="root"

if array_contains "${HOST}" "${EXCEPTIONS[@]}"; then
   HOST="$HOST"
else
   HOST="msa$HOST"
fi

if array_contains "${HOST}" "${USER[@]}"; then
   USERNAME="lpeltier"
fi

if [[ "${HOST}" == "cafecoredevroot" ]]; then
   HOST="cafecoredev"
fi

if ! ssh -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=ask ${USERNAME}@${HOST}.${DOMAIN}; then
   echo "SSH failed, attempting to copy ssh key..."
   if ! ssh-copy-id ${USERNAME}@${HOST}.${DOMAIN}; then
      echo "Failed to copy ssh key"
      exit 1
   fi
   ssh -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=ask ${USERNAME}@${HOST}.${DOMAIN}
fi
