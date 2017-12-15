
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
        sagaMiddleware: createSagaMiddleware(),
        namespace: reservedWord.slice(0)
    };

    let _config = {
        initialState: {},
        onError: () => void(0),
        extraEnhancers: [],
        model:[]
    };

    extend(_config, config);


    init(app, _config);

    if(isArray(_config.model)){
        _config.forEach(model=>{
            addModel(model)
        })
    }

    const {replaceReducer, ...other} = app.store;
    return {
        addModel, ...other
    };

    function addModel(model) {
        _addModel(app, model)
    }
}


/**
 *app init :createStore & rewrite handleError
 * @param app
 * @param config
 */
function init(app, config) {
    const {initialState} = config;
    let reducer = getReducer(app);
    let enhancers = getEnhancers(app, config);
    app.store = createStore(
        reducer, initialState, compose(...enhancers)
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
 * @param model
 * @private
 */
function _addModel(app, model) {

    if (warning(!isObject(model), 'model should be object')) return;
    const _model = extend(
        {
            effects: {},
            state: {}
        },
        model
    );

    if (warning(!isString(_model.namespace), `namespace should be string but got ${typeof namespace}`)) return;
    if (warning(reservedWord.indexOf(_model.namespace) > -1, `namespace should not be one of  '${reservedWord.join(' ')}'`)) return;
    //避免重复添加model
    if (warning(app.namespace.indexOf(_model.namespace) > -1, `namespace should not be one of  '${app.namespace.join(' ')}'`)) return;
    if (warning(!isPlainObject(_model.reducers), 'reducers should be object')) return;
    if (warning(!isPlainObject(_model.state), 'state should be object')) return;

    app.namespace.push(_model.namespace);

    //创建reducer并修改store
    const _reducer = createReducer(_model);
    app.reducers = Object.assign({}, app.reducers, {[_model.namespace]: _reducer});
    app.store.replaceReducer(getReducer(app));

    //创建saga
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
    const {extraEnhancers} = config;
    let {sagaMiddleware} = app;
    let devtools = [];

    const logger = store => next => action => {
        console.log('dispatching', action);
        let result = next(action);
        console.log('next state', store.getState());
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
            //Ignore the error: window is not defined
        }

    }
    //__REDUX_DEVTOOLS_EXTENSION__ 会改变sagamiddleware 里面的action,所以把它放后面去
    return [applyMiddleware(sagaMiddleware), ...extraEnhancers].concat(devtools)
}


/**
 * createReducer
 * @param model
 * @returns {Function}
 */
function createReducer(model) {
    const {namespace, reducers} = model;
    const initialState = model.state;

    return function (state = initialState, {type, ...other}) {
        let names = type.split(separator);
        if (names.length === 2 && namespace === names[0] && isFunction(reducers[names[1]])) {
            state = reducers[names[1]](state, other)
        }
        return state
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
            //只有action.prefix === false 时不需要补充前缀
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
