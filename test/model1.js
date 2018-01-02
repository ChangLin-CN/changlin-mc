
 export const namespace='model1';

 function asyncFn (n) {
     return new Promise((resolve,reject)=>{
         setTimeout(()=>resolve(n),100)
     })
 }

 function mockAsyncError(error) {
     return new Promise((resolve,reject)=>{
         setTimeout(()=>reject(error),100)
     })
 }


export let model1={
    namespace,
    state:{
        count:1
    },
    effects:{
        *changeCount({payload:{count}},{put,call,select}){
            const c=yield call(asyncFn,count);
            yield put({
                type:'updateState',
                payload:{
                    count:c
                }
            })
        },
        *throwError({payload:{error}}){
            yield 1;
            throw new Error(error)
        },
        *throwError2({payload:{error}},{call}){
            yield call (mockAsyncError,error)
        }
    },
    reducers:{
        updateState(state,{payload}){
            Object.assign(state,payload);
        }
    }
}


