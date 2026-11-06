import React,{useEffect,useState} from 'react';
import {useGetServerInfoQuery} from 'slices/api';
import {getReqErrorMessage} from 'utils/requests.utils';
export default function WaitForServerInfo({children}:React.PropsWithChildren<{}>){
 const {isLoading,isFetching,error,refetch}=useGetServerInfoQuery(undefined,{refetchOnReconnect:true});
 const [delayed,setDelayed]=useState(false);
 useEffect(()=>{setDelayed(false);const timer=setTimeout(()=>setDelayed(true),8000);return()=>clearTimeout(timer)},[isLoading]);
 if(isLoading)return <div className="vw-service-loading" role="status"><span className="vw-service-dots" aria-hidden="true"><i/><i/><i/></span><span>{delayed?'Taking longer than usual. Checking the connection…':'Connecting to Scheduler…'}</span></div>;
 if(error)return <section className="vw-service-recovery" role="alert"><h2>Unable to reach Scheduler</h2><p>{getReqErrorMessage(error)}</p><button className="btn btn-primary" disabled={isFetching} onClick={()=>refetch()}>{isFetching?'Retrying…':'Try again'}</button></section>;
 return <>{children}</>;
}
