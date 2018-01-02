
import {applyMiddleware, combineReducers, compose, createStore} from 'redux'
import {warning} from 'changlin-warning'
import createSagaMiddleware from 'redux-saga'
import * as sagaEffects from 'redux-saga/effects'
import {isArray, isFunction, isObject, isPlainObject, isString, isType, isWindow, extend} from 'changlin-util'


const {takeEvery, takeLatest, throttle} = sagaEffects;


//namespace reserved word
const reservedWord = ['router', 'loading'],
    separator = '/';

export  function createApp (config = {}) {
    const _config = {
        initialState: {},
        onError: () => void(0),
        extraEnhancers: [],
        model:[],
        usedInVue:false
    };
    if(isObject(config)){extend(_config, config)}

    const app = {
        reducers: {
            //integrate loading
            loading: (state = {effects: {}}, {type, payload}) => {
                if (type === 'loading') {
                    let {effects, ...other} = payload;
                    return {...state, effects: {...state.effects, ...effects}, ...other}
                }
                return state
            }
        },
        sagaMiddleware: createSagaMiddleware(),
        namespace: reservedWord.slice(0)
    };


    init(app, _config);

    if(isArray(_config.model)){
        _config.model.forEach(model=>{
            addModel(model)
        })
    }

    const {replaceReducer, ...other} = app.store;
    return {
        addModel, ...other
    };

    function addModel(model) {
        _addModel(app,config, model)
    }
}


// helper

/**
 *app init :createStore & rewrite handleError
 * @param app
 * @param config
 */
function init(app, config) {
    const reducer = getReducer(app),
        enhancers = getEnhancers(app, config);
    app.store = createStore(
        reducer, compose(...enhancers)
    );
    app.handleError = function (desc) {
        const {onError} = config;
        if (isString(desc)) {
            onError(new Error(desc))
        } else {
            onError(desc)
        }
    }
}

/**
 * add model to app
 *
 * @param app
 * @param config
 * @param model
 * @private
 */
function _addModel(app, config,model) {

    if (warning(!isObject(model), 'model should be object')) return;
    const _model = extend(
        {
            effects: {},
            state: {}
        },
        model
    );

    if (warning(!isString(_model.namespace), `namespace should be string but got ${typeof namespace}`)) return;
    if (warning(reservedWord.indexOf(_model.namespace) > -1, `The namespace of model(${_model.namespace}) should not be one of  '${reservedWord.join(' ')}'`)) return;
    //Avoid duplicate additions
    if (warning(app.namespace.indexOf(_model.namespace) > -1, `The model(${_model.namespace}) is already in use`)) return;
    if (warning(!isPlainObject(_model.reducers), `The reducers of model(${_model.namespace}) should be object`)) return;
    if (warning(!isPlainObject(_model.state), `The state of model(${_model.namespace}) should be object`)) return;

    app.namespace.push(_model.namespace);

    //create reducer and replace reducer
    const _reducer = createReducer(config,_model);
    app.reducers = extend({}, app.reducers, {[_model.namespace]: _reducer});
    app.store.replaceReducer(getReducer(app));

    //create saga
    if (isObject(_model.effects)) {
        app.sagaMiddleware.run(createSaga(app, _model))
    }

}


/**
 * combineReducers
 * @param app
 * @returns {*}
 */
function getReducer(app) {
    if (app.reducers) {
        return combineReducers(app.reducers)
    } else {
        return (state = {}) => state
    }

}


/**
 * getEnhancers
 * @param app
 * @param config
 * @returns {Array.<*>}
 */
function getEnhancers(app, config) {
    const {extraEnhancers} = config,
        {sagaMiddleware} = app,
        devtools = [];

    const logger = store => next => action => {
        console.log('dispatching:', action);
        const result = next(action);
        console.log('next state:', store.getState());
        return result
    };

    if (process.env.NODE_ENV !== 'production') {
        try {
            if (isWindow(window) && isFunction(window.__REDUX_DEVTOOLS_EXTENSION__)) {
                devtools.push(window.__REDUX_DEVTOOLS_EXTENSION__())
            } else {
                devtools.push(applyMiddleware(logger));
            }
        } catch (e) {
            //Ignore the error: 'window is not defined'
        }

    }
    //__REDUX_DEVTOOLS_EXTENSION__ will change the actions that created by sagamiddleware ,so i put it to the end
    return [applyMiddleware(sagaMiddleware), ...extraEnhancers].concat(devtools)
}


/**
 * createReducer
 * @param config
 * @param model
 * @returns {Function}
 */
function createReducer(config,model) {
    const {namespace, reducers} = model;
    const initialState = extend(model.state,isObject(config.initialState) ? config.initialState[namespace]:{});
    return function (state = initialState, {type, ...other}) {
        const names = type.split(separator);
        let newState=state;
        if (names.length === 2 && namespace === names[0] && isFunction(reducers[names[1]])) {
            newState = reducers[names[1]](state, other) || state
        }

        if(config.usedInVue){
            return newState
        }

        if(newState!==state){
            return newState
        }

        return {...newState}
    }
}

/**
 * createSaga
 * @param app
 * @param model
 * @returns {Function}
 */
function createSaga(app, model) {
    const {namespace, effects} = model;
    const {handleError} = app;

    return function* () {
        let keys = Object.keys(effects);
        for (let key of keys) {
            let task = yield sagaEffects.fork(createWatcher(namespace, key, effects[key], handleError))
        }
    };

}


/**
 * prefixActionType
 * @param namespace
 * @returns {{put: put}}
 */
function prefixActionType(namespace) {
    function put(action) {
        if (isPlainObject(action)) {
            //no prefix only when action.prefix === false
            if (action.prefix === false) return sagaEffects.put(action)

            let {type} = action;
            if (isString(type)) {
                if (type.indexOf(separator) > 0) {
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


/**
 * createWatcher
 * @param namespace
 * @param key
 * @param effect
 * @param handleError
 * @returns {Function}
 */
function createWatcher(namespace, key, effect, handleError) {
    let type = 'takeEvery',
        time,
        fn;

    if (isFunction(effect)) {
        fn = effect;
    } else if (isArray(effect)) {
        fn = effect[0];
        type = effect[1].type || 'takeEvery';
        time = effect[1].time || 0;
        if (warning(type === 'throttle' && (!isType('positiveNumber', time)), `time is not number(${namespace} )`)) {
            time = 0
        }
    }

    const wrapper = function* (action) {
        let err;
        try {
            yield sagaEffects.put({
                type: 'loading',
                payload: {
                    effects: {[namespace + separator + key]: true}
                }
            });
            yield fn(action, {...sagaEffects, ...prefixActionType(namespace)})
        } catch (e) {
            err = e;
        }
        yield   sagaEffects.put({
            type: 'loading',
            payload: {
                effects: {[namespace + separator + key]: false}
            }
        });
        if (err) {
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
