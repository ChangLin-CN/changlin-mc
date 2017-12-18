'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _objectWithoutProperties2 = require('babel-runtime/helpers/objectWithoutProperties');

var _objectWithoutProperties3 = _interopRequireDefault(_objectWithoutProperties2);

exports.createApp = createApp;

var _redux = require('redux');

var _changlinWarning = require('changlin-warning');

var _reduxSaga = require('redux-saga');

var _reduxSaga2 = _interopRequireDefault(_reduxSaga);

var _effects3 = require('redux-saga/effects');

var sagaEffects = _interopRequireWildcard(_effects3);

var _changlinUtil = require('changlin-util');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var takeEvery = sagaEffects.takeEvery,
    takeLatest = sagaEffects.takeLatest,
    throttle = sagaEffects.throttle;

//namespace reserved word

var reservedWord = ['router', 'loading'],
    separator = '/';

function createApp() {
    var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    var app = {
        reducers: {
            //集成loading
            loading: function loading() {
                var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : { effects: {} };
                var _ref = arguments[1];
                var type = _ref.type,
                    payload = _ref.payload;

                if (type === 'loading') {
                    var effects = payload.effects,
                        _other = (0, _objectWithoutProperties3.default)(payload, ['effects']);

                    return (0, _extends3.default)({}, state, { effects: (0, _extends3.default)({}, state.effects, effects) }, _other);
                }
                return state;
            }
        },
        sagaMiddleware: (0, _reduxSaga2.default)(),
        namespace: reservedWord.slice(0)
    };

    var _config = {
        initialState: {},
        onError: function onError() {
            return void 0;
        },
        extraEnhancers: [],
        model: []
    };

    (0, _changlinUtil.extend)(_config, config);

    init(app, _config);

    if ((0, _changlinUtil.isArray)(_config.model)) {
        _config.model.forEach(function (model) {
            addModel(model);
        });
    }

    var _app$store = app.store,
        replaceReducer = _app$store.replaceReducer,
        other = (0, _objectWithoutProperties3.default)(_app$store, ['replaceReducer']);

    return (0, _extends3.default)({
        addModel: addModel }, other);

    function addModel(model) {
        _addModel(app, config, model);
    }
}

// helper

/**
 *app init :createStore & rewrite handleError
 * @param app
 * @param config
 */
function init(app, config) {
    var reducer = getReducer(app);
    var enhancers = getEnhancers(app, config);
    app.store = (0, _redux.createStore)(reducer, _redux.compose.apply(undefined, (0, _toConsumableArray3.default)(enhancers)));
    app.handleError = function (desc) {
        var onError = config.onError;

        if ((0, _changlinUtil.isString)(desc)) {
            onError(new Error(desc));
        } else {
            onError(desc);
        }
    };
}

/**
 * add model to app
 *
 * @param app
 * @param config
 * @param model
 * @private
 */
function _addModel(app, config, model) {

    if ((0, _changlinWarning.warning)(!(0, _changlinUtil.isObject)(model), 'model should be object')) return;
    var _model = (0, _changlinUtil.extend)({
        effects: {},
        state: {}
    }, model);

    if ((0, _changlinWarning.warning)(!(0, _changlinUtil.isString)(_model.namespace), 'namespace should be string but got ' + (typeof namespace === 'undefined' ? 'undefined' : (0, _typeof3.default)(namespace)))) return;
    if ((0, _changlinWarning.warning)(reservedWord.indexOf(_model.namespace) > -1, 'namespace should not be one of  \'' + reservedWord.join(' ') + '\'')) return;
    //避免重复添加model
    if ((0, _changlinWarning.warning)(app.namespace.indexOf(_model.namespace) > -1, 'namespace should not be one of  \'' + app.namespace.join(' ') + '\'')) return;
    if ((0, _changlinWarning.warning)(!(0, _changlinUtil.isPlainObject)(_model.reducers), 'reducers should be object')) return;
    if ((0, _changlinWarning.warning)(!(0, _changlinUtil.isPlainObject)(_model.state), 'state should be object')) return;

    app.namespace.push(_model.namespace);

    //创建reducer并修改store
    var _reducer = createReducer(config, _model);
    app.reducers = (0, _changlinUtil.extend)({}, app.reducers, (0, _defineProperty3.default)({}, _model.namespace, _reducer));
    app.store.replaceReducer(getReducer(app));

    //创建saga
    if ((0, _changlinUtil.isObject)(_model.effects)) {
        app.sagaMiddleware.run(createSaga(app, _model));
    }
}

/**
 * combineReducers
 * @param app
 * @returns {*}
 */
function getReducer(app) {
    if (app.reducers) {
        return (0, _redux.combineReducers)(app.reducers);
    } else {
        return function () {
            var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
            return state;
        };
    }
}

/**
 * getEnhancers
 * @param app
 * @param config
 * @returns {Array.<*>}
 */
function getEnhancers(app, config) {
    var extraEnhancers = config.extraEnhancers;
    var sagaMiddleware = app.sagaMiddleware;

    var devtools = [];

    var logger = function logger(store) {
        return function (next) {
            return function (action) {
                console.log('dispatching', action);
                var result = next(action);
                console.log('next state', store.getState());
                return result;
            };
        };
    };

    if (process.env.NODE_ENV !== 'production') {
        try {
            if ((0, _changlinUtil.isWindow)(window) && (0, _changlinUtil.isFunction)(window.__REDUX_DEVTOOLS_EXTENSION__)) {
                devtools.push(window.__REDUX_DEVTOOLS_EXTENSION__());
            } else {
                devtools.push((0, _redux.applyMiddleware)(logger));
            }
        } catch (e) {
            //Ignore the error: window is not defined
        }
    }
    //__REDUX_DEVTOOLS_EXTENSION__ 会改变sagamiddleware 里面的action,所以把它放后面去
    return [(0, _redux.applyMiddleware)(sagaMiddleware)].concat((0, _toConsumableArray3.default)(extraEnhancers)).concat(devtools);
}

/**
 * createReducer
 * @param config
 * @param model
 * @returns {Function}
 */
function createReducer(config, model) {
    var namespace = model.namespace,
        reducers = model.reducers;

    var initialState = (0, _changlinUtil.extend)(model.state, (0, _changlinUtil.isObject)(config.initialState) ? config.initialState[namespace] : {});
    return function () {
        var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : initialState;
        var _ref2 = arguments[1];
        var type = _ref2.type,
            other = (0, _objectWithoutProperties3.default)(_ref2, ['type']);

        var names = type.split(separator);
        if (names.length === 2 && namespace === names[0] && (0, _changlinUtil.isFunction)(reducers[names[1]])) {
            state = reducers[names[1]](state, other);
        }
        return state;
    };
}

/**
 * createSaga
 * @param app
 * @param model
 * @returns {Function}
 */
function createSaga(app, model) {
    var namespace = model.namespace,
        effects = model.effects;
    var handleError = app.handleError;


    return (/*#__PURE__*/_regenerator2.default.mark(function _callee() {
            var keys, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, key, task;

            return _regenerator2.default.wrap(function _callee$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:
                            keys = (0, _keys2.default)(effects);
                            _iteratorNormalCompletion = true;
                            _didIteratorError = false;
                            _iteratorError = undefined;
                            _context.prev = 4;
                            _iterator = (0, _getIterator3.default)(keys);

                        case 6:
                            if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                                _context.next = 14;
                                break;
                            }

                            key = _step.value;
                            _context.next = 10;
                            return sagaEffects.fork(createWatcher(namespace, key, effects[key], handleError));

                        case 10:
                            task = _context.sent;

                        case 11:
                            _iteratorNormalCompletion = true;
                            _context.next = 6;
                            break;

                        case 14:
                            _context.next = 20;
                            break;

                        case 16:
                            _context.prev = 16;
                            _context.t0 = _context['catch'](4);
                            _didIteratorError = true;
                            _iteratorError = _context.t0;

                        case 20:
                            _context.prev = 20;
                            _context.prev = 21;

                            if (!_iteratorNormalCompletion && _iterator.return) {
                                _iterator.return();
                            }

                        case 23:
                            _context.prev = 23;

                            if (!_didIteratorError) {
                                _context.next = 26;
                                break;
                            }

                            throw _iteratorError;

                        case 26:
                            return _context.finish(23);

                        case 27:
                            return _context.finish(20);

                        case 28:
                        case 'end':
                            return _context.stop();
                    }
                }
            }, _callee, this, [[4, 16, 20, 28], [21,, 23, 27]]);
        })
    );
}

/**
 * prefixActionType
 * @param namespace
 * @returns {{put: put}}
 */
function prefixActionType(namespace) {
    function put(action) {
        if ((0, _changlinUtil.isPlainObject)(action)) {
            //只有action.prefix === false 时不需要补充前缀
            if (action.prefix === false) return sagaEffects.put(action);

            var type = action.type;

            if ((0, _changlinUtil.isString)(type)) {
                if (type.indexOf(separator) > 0) {
                    return sagaEffects.put(action);
                } else {
                    action.type = namespace + separator + type;
                    return sagaEffects.put(action);
                }
            } else {
                throw new Error('action type is not string!');
            }
        } else {
            throw new Error('action is not a plain object!');
        }
    }

    return { put: put };
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
    var type = 'takeEvery',
        time = void 0,
        fn = void 0;

    if ((0, _changlinUtil.isFunction)(effect)) {
        fn = effect;
    } else if ((0, _changlinUtil.isArray)(effect)) {
        fn = effect[0];
        type = effect[1].type || 'takeEvery';
        time = effect[1].time || 0;
        if ((0, _changlinWarning.warning)(type === 'throttle' && !(0, _changlinUtil.isType)('positiveNumber', time), 'time is not number')) {
            time = 0;
        }
    }

    var wrapper = /*#__PURE__*/_regenerator2.default.mark(function wrapper(action) {
        var err;
        return _regenerator2.default.wrap(function wrapper$(_context2) {
            while (1) {
                switch (_context2.prev = _context2.next) {
                    case 0:
                        err = void 0;
                        _context2.prev = 1;
                        _context2.next = 4;
                        return sagaEffects.put({
                            type: 'loading',
                            payload: {
                                effects: (0, _defineProperty3.default)({}, namespace + separator + key, true)
                            }
                        });

                    case 4:
                        _context2.next = 6;
                        return fn(action, (0, _extends3.default)({}, sagaEffects, prefixActionType(namespace)));

                    case 6:
                        _context2.next = 11;
                        break;

                    case 8:
                        _context2.prev = 8;
                        _context2.t0 = _context2['catch'](1);

                        err = _context2.t0;

                    case 11:
                        _context2.next = 13;
                        return sagaEffects.put({
                            type: 'loading',
                            payload: {
                                effects: (0, _defineProperty3.default)({}, namespace + separator + key, false)
                            }
                        });

                    case 13:
                        if (err) {
                            handleError(err);
                        }

                    case 14:
                    case 'end':
                        return _context2.stop();
                }
            }
        }, wrapper, this, [[1, 8]]);
    });

    switch (type) {
        case 'takeEvery':
            return (/*#__PURE__*/_regenerator2.default.mark(function _callee2() {
                    return _regenerator2.default.wrap(function _callee2$(_context3) {
                        while (1) {
                            switch (_context3.prev = _context3.next) {
                                case 0:
                                    _context3.next = 2;
                                    return takeEvery(namespace + separator + key, wrapper);

                                case 2:
                                case 'end':
                                    return _context3.stop();
                            }
                        }
                    }, _callee2, this);
                })
            );
        case 'takeLatest':
            return (/*#__PURE__*/_regenerator2.default.mark(function _callee3() {
                    return _regenerator2.default.wrap(function _callee3$(_context4) {
                        while (1) {
                            switch (_context4.prev = _context4.next) {
                                case 0:
                                    _context4.next = 2;
                                    return takeLatest(namespace + separator + key, wrapper);

                                case 2:
                                case 'end':
                                    return _context4.stop();
                            }
                        }
                    }, _callee3, this);
                })
            );
        case 'throttle':
            return (/*#__PURE__*/_regenerator2.default.mark(function _callee4() {
                    return _regenerator2.default.wrap(function _callee4$(_context5) {
                        while (1) {
                            switch (_context5.prev = _context5.next) {
                                case 0:
                                    _context5.next = 2;
                                    return throttle(time, namespace + separator + key, wrapper);

                                case 2:
                                case 'end':
                                    return _context5.stop();
                            }
                        }
                    }, _callee4, this);
                })
            );
        default:
            return (/*#__PURE__*/_regenerator2.default.mark(function _callee5() {
                    return _regenerator2.default.wrap(function _callee5$(_context6) {
                        while (1) {
                            switch (_context6.prev = _context6.next) {
                                case 0:
                                    _context6.next = 2;
                                    return takeEvery(namespace + separator + key, wrapper);

                                case 2:
                                case 'end':
                                    return _context6.stop();
                            }
                        }
                    }, _callee5, this);
                })
            );
    }
}