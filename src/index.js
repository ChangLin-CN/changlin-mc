/*
* 以React   React-router   redux   redux-saga为基础搭建一套框架
* */

import React from 'react'
import ReactDOM from 'react-dom'
import {applyMiddleware, combineReducers, compose, createStore} from 'redux'
import {warning} from 'changlin-warning'
import {Provider} from 'react-redux'
import createSagaMiddleware from 'redux-saga'
import * as sagaEffects from 'redux-saga/effects'
import {isArray, isFunction, isObject, isPlainObject, isString, isType} from 'changlin-util'


let {takeEvery, takeLatest, throttle} = sagaEffects;

//namespace 保留字
const reservedWord = ['router', 'loading'],
      separator    = '/';

export let createApp = function (config = {}) {
    //app 的所有数据
    let app = {
        reducers: {
            //集成loading
            loading: (state = {effects: {}}, {type, payload}) => {
                if (type === 'loading') {
                    let {effects, ...other} = payload;
                    return {...state, effects: {...state.effects, ...effects}, ...other}
                }
                return state
            }
        },
        Router: undefined,
        sagaMiddleware: createSagaMiddleware(),
        namespace: reservedWord.slice(0)
    };
    let {
            initialState   = {},
            onError        = () => void(0),
            router         = <div/>,
            extraEnhancers = [],
        
        }   = config;
    
    return init(config);
    
    //一些方法
    function init() {
        let reducer   = getReducer();
        let enhancers = getEnhancers();
        app.store     = createStore(
            reducer, initialState, compose(...enhancers)
        );
        app.Router    = router;
        
        return {
            addModel,
            setRouter,
            start,
            dispatch: app.store.dispatch,
            getState: () => app.store.getState()
        }
    }
    
    //启动app
    function start(selector) {
        let container;
        let {Router, store} = app;
        if (!warning(!isString(selector), 'selector should be string.')) {
            try {
                container = document.querySelector(selector);
            } catch (e) {
                warning(true, e)
            }
        }
        
        if (!container) return;
        
        ReactDOM.render(<Provider store={store}><Router addModel={addModel}/></Provider>, container)
    }
    
    //设置路由
    function setRouter(Router = <div/>) {
        app.Router = Router
    }
    
    //获取增强器
    function getEnhancers() {
        let {sagaMiddleware} = app;
        let devtools         = [];
        
        const logger = store => next => action => {
            console.log('dispatching', action);
            let result = next(action);
            console.log('next state', store.getState());
            return result
        };
        
        if (process.env.NODE_ENV !== 'production') {
            if (isObject(window) && isFunction(window.__REDUX_DEVTOOLS_EXTENSION__)) {
                devtools.push(window.__REDUX_DEVTOOLS_EXTENSION__())
            } else {
                devtools.push(applyMiddleware(logger));
            }
        }
        //__REDUX_DEVTOOLS_EXTENSION__ 会改变sagamiddleware 里面的action,所以把它放后面去
        return [applyMiddleware(sagaMiddleware), ...extraEnhancers].concat(devtools)
    }
    
    //合并reducer
    function getReducer() {
        if (app.reducers) {
            return combineReducers(app.reducers)
        } else {
            return (state = {}) => state
        }
        
    }
    
    //添加数据模型
    function addModel(model) {
        
        if (warning(!isObject(model), 'model should be object')) return;
        let {
                namespace,
                effects = {},
                state   = {},
                reducers
            } = model;
        
        if (warning(!isString(namespace), `namespace should be string but got ${typeof namespace}`)) return;
        if (warning(reservedWord.indexOf(namespace) > -1, `namespace should not be one of  '${reservedWord.join(' ')}'`)) return;
        if (warning(app.namespace.indexOf(namespace) > -1, `namespace should not be one of  '${app.namespace.join(' ')}'`)) return;
        if (warning(!isPlainObject(reducers), 'reducers should be object')) return;
        if (warning(!isPlainObject(state), 'state should be object')) return;
        //避免重复添加model
        app.namespace.push(namespace);
        
        //创建reducer并修改store
        let _reducer = createReducer(namespace, state, reducers);
        app.reducers = Object.assign({}, app.reducers, {[namespace]: _reducer})
        app.store.replaceReducer(getReducer());
        
        //创建saga
        if (isObject(effects)) {
            app.sagaMiddleware.run(createSaga(namespace, effects, handleError))
        }
        
    }
    
    //生成此model的reducer
    function createReducer(namespace, initialState, reducers) {
        return function (state = initialState, {type, ...other}) {
            let names = type.split(separator);
            if (names.length === 2 && namespace === names[0] && isFunction(reducers[names[1]])) {
                state = reducers[names[1]](state, other)
            }
            return state
        }
    }
    
    //生成此model的saga
    function createSaga(namespace, effects, handleError) {
        return function* () {
            let keys = Object.keys(effects);
            for (let key of keys) {
                let task = yield sagaEffects.fork(createWatcher(namespace, key, effects[key], handleError))
            }
        };
        
    }
    
    //生成watcher
    function createWatcher(namespace, key, effect, handleError) {
        let type = 'takeEvery',
            time,
            fn;
        
        if (isFunction(effect)) {
            fn = effect;
        } else if (isArray(effect)) {
            fn   = effect[0];
            type = effect[1].type || 'takeEvery';
            time = effect[1].time || 0;
            if (warning(type === 'throttle' && (!isType('positiveNumber', time)), 'time is not number')) {
                time = 0
            }
        }
        
        let wrapper = function* (action) {
            let err;
            try {
                yield sagaEffects.put({
                    type: 'loading',
                    payload: {
                        effects: {[namespace + separator + key]: true}
                    }
                });
                yield fn(action, {...sagaEffects, ...createSagaEffectsFnWrapper(namespace)})
            } catch (e) {
                err=e;
            }
            yield   sagaEffects.put({
                type: 'loading',
                payload: {
                    effects: {[namespace + separator + key]: false}
                }
            });
            if(err){
                handleError(err)
            }
        };
        
        switch (type) {
            case 'takeEvery':
                return function* () {
                    yield takeEvery(namespace + separator + key, wrapper);
                };
            case 'takeLatest':
                return function* () {
                    yield takeLatest(namespace + separator + key, wrapper);
                };
            case 'throttle':
                return function* () {
                    yield throttle(time, namespace + separator + key, wrapper);
                };
            default:
                return function* () {
                    yield takeEvery(namespace + separator + key, wrapper);
                };
        }
    }
    
    //处理错误
    function handleError(desc) {
        if (isString(desc)) {
            onError(new Error(desc))
        } else {
            onError(desc)
        }
    }
    
    //二次封装sagaEffects put 方法
    function createSagaEffectsFnWrapper(namespace) {
        function put(action) {
            if (isPlainObject(action)) {
                //只有action.prefix === false 时不需要补充前缀
                if (action.prefix === false) return sagaEffects.put(action)
                
                let {type} = action;
                if (isString(type)) {
                    if (type.indexOf(namespace + separator) === 0) {
                        return sagaEffects.put(action)
                    } else {
                        action.type = namespace + separator + type;
                        return sagaEffects.put(action)
                    }
                } else {
                    throw new Error('action type is not string!')
                }
                
            } else {
                throw new Error('action is not a plain object!')
            }
        }
        
        return {put}
    }
};






