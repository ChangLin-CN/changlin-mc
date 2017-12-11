'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.createApp = undefined;

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _objectWithoutProperties2 = require('babel-runtime/helpers/objectWithoutProperties');

var _objectWithoutProperties3 = _interopRequireDefault(_objectWithoutProperties2);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactDom = require('react-dom');

var _reactDom2 = _interopRequireDefault(_reactDom);

var _redux = require('redux');

var _changlinWarning = require('changlin-warning');

var _reactRedux = require('react-redux');

var _reduxSaga = require('redux-saga');

var _reduxSaga2 = _interopRequireDefault(_reduxSaga);

var _effects3 = require('redux-saga/effects');

var sagaEffects = _interopRequireWildcard(_effects3);

var _changlinUtil = require('changlin-util');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*
* 以React   React-router   redux   redux-saga为基础搭建一套框架
* */

var takeEvery = sagaEffects.takeEvery,
    takeLatest = sagaEffects.takeLatest,
    throttle = sagaEffects.throttle;

//namespace 保留字

var reservedWord = ['router', 'loading'],
    separator = '/';

var createApp = function createApp() {
    var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    //app 的所有数据
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
                        other = (0, _objectWithoutProperties3.default)(payload, ['effects']);

                    return (0, _extends3.default)({}, state, { effects: (0, _extends3.default)({}, state.effects, effects) }, other);
                }
                return state;
            }
        },
        Router: undefined,
        sagaMiddleware: (0, _reduxSaga2.default)(),
        namespace: reservedWord.slice(0)
    };
    var _config$initialState = config.initialState,
        initialState = _config$initialState === undefined ? {} : _config$initialState,
        _config$onError = config.onError,
        onError = _config$onError === undefined ? function () {
        return void 0;
    } : _config$onError,
        _config$router = config.router,
        router = _config$router === undefined ? _react2.default.createElement('div', null) : _config$router,
        _config$extraEnhancer = config.extraEnhancers,
        extraEnhancers = _config$extraEnhancer === undefined ? [] : _config$extraEnhancer;


    return init(config);

    //一些方法
    function init() {
        var reducer = getReducer();
        var enhancers = getEnhancers();
        app.store = (0, _redux.createStore)(reducer, initialState, _redux.compose.apply(undefined, (0, _toConsumableArray3.default)(enhancers)));
        app.Router = router;

        return {
            addModel: addModel,
            setRouter: setRouter,
            start: start,
            dispatch: app.store.dispatch,
            getState: function getState() {
                return app.store.getState();
            }
        };
    }

    //启动app
    function start(selector) {
        var container = void 0;
        var Router = app.Router,
            store = app.store;

        if (!(0, _changlinWarning.warning)(!(0, _changlinUtil.isString)(selector), 'selector should be string.')) {
            try {
                container = document.querySelector(selector);
            } catch (e) {
                (0, _changlinWarning.warning)(true, e);
            }
        }

        if (!container) return;

        _reactDom2.default.render(_react2.default.createElement(
            _reactRedux.Provider,
            { store: store },
            _react2.default.createElement(Router, { addModel: addModel })
        ), container);
    }

    //设置路由
    function setRouter() {
        var Router = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : _react2.default.createElement('div', null);

        app.Router = Router;
    }

    //获取增强器
    function getEnhancers() {
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
            if ((0, _changlinUtil.isWindow)(window) && (0, _changlinUtil.isFunction)(window.__REDUX_DEVTOOLS_EXTENSION__)) {
                devtools.push(window.__REDUX_DEVTOOLS_EXTENSION__());
            } else {
                devtools.push((0, _redux.applyMiddleware)(logger));
            }
        }
        //__REDUX_DEVTOOLS_EXTENSION__ 会改变sagamiddleware 里面的action,所以把它放后面去
        return [(0, _redux.applyMiddleware)(sagaMiddleware)].concat((0, _toConsumableArray3.default)(extraEnhancers)).concat(devtools);
    }

    //合并reducer
    function getReducer() {
        if (app.reducers) {
            return (0, _redux.combineReducers)(app.reducers);
        } else {
            return function () {
                var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
                return state;
            };
        }
    }

    //添加数据模型
    function addModel(model) {

        if ((0, _changlinWarning.warning)(!(0, _changlinUtil.isObject)(model), 'model should be object')) return;
        var namespace = model.namespace,
            _model$effects = model.effects,
            effects = _model$effects === undefined ? {} : _model$effects,
            _model$state = model.state,
            state = _model$state === undefined ? {} : _model$state,
            reducers = model.reducers;


        if ((0, _changlinWarning.warning)(!(0, _changlinUtil.isString)(namespace), 'namespace should be string but got ' + (typeof namespace === 'undefined' ? 'undefined' : (0, _typeof3.default)(namespace)))) return;
        if ((0, _changlinWarning.warning)(reservedWord.indexOf(namespace) > -1, 'namespace should not be one of  \'' + reservedWord.join(' ') + '\'')) return;
        if ((0, _changlinWarning.warning)(app.namespace.indexOf(namespace) > -1, 'namespace should not be one of  \'' + app.namespace.join(' ') + '\'')) return;
        if ((0, _changlinWarning.warning)(!(0, _changlinUtil.isPlainObject)(reducers), 'reducers should be object')) return;
        if ((0, _changlinWarning.warning)(!(0, _changlinUtil.isPlainObject)(state), 'state should be object')) return;
        //避免重复添加model
        app.namespace.push(namespace);

        //创建reducer并修改store
        var _reducer = createReducer(namespace, state, reducers);
        app.reducers = (0, _assign2.default)({}, app.reducers, (0, _defineProperty3.default)({}, namespace, _reducer));
        app.store.replaceReducer(getReducer());

        //创建saga
        if ((0, _changlinUtil.isObject)(effects)) {
            app.sagaMiddleware.run(createSaga(namespace, effects, handleError));
        }
    }

    //生成此model的reducer
    function createReducer(namespace, initialState, reducers) {
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

    //生成此model的saga
    function createSaga(namespace, effects, handleError) {
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

    //生成watcher
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
                            return fn(action, (0, _extends3.default)({}, sagaEffects, createSagaEffectsFnWrapper(namespace)));

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

    //处理错误
    function handleError(desc) {
        if ((0, _changlinUtil.isString)(desc)) {
            onError(new Error(desc));
        } else {
            onError(desc);
        }
    }

    //二次封装sagaEffects put 方法
    function createSagaEffectsFnWrapper(namespace) {
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
};
exports.createApp = createApp;