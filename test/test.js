import {createApp} from "../src/index";

const expect = require('chai').expect;

import {model1, namespace as model1Namespace} from "./model1";

let err = null,errorCount=0;


const appDemo = createApp({
    onError: error => {err = error,errorCount++}
});


describe('methods check', function () {
    it('addMOdel should be function', function () {
        expect(appDemo.addModel).to.be.a('function');
    });

    it('dispatch should be function', function () {
        expect(appDemo.dispatch).to.be.a('function');
    });

    it('getState should be function', function () {
        expect(appDemo.getState).to.be.a('function');
    });

    it('subscribe should be function', function () {
        expect(appDemo.subscribe).to.be.a('function');
    });

});

describe('function test', function () {
    appDemo.addModel(model1);

    it('get initial state', function () {
        const state = appDemo.getState();
        expect(state[model1Namespace].count).to.be.equal(1);
    });

    it('dispatch action(effects)', function (done) {
        appDemo.dispatch({
            type: model1Namespace + '/changeCount',
            payload: {
                count: 3
            }
        })
        expect(appDemo.getState()[model1Namespace].count).to.be.equal(1);
        setTimeout(() => {
            expect(appDemo.getState()[model1Namespace].count).to.be.equal(3);
            done()
        }, 101)
    });

    it('dispatch action(reducer)', function () {
        expect(appDemo.getState()[model1Namespace].count).to.be.equal(3);

        appDemo.dispatch({
            type: model1Namespace + '/updateState',
            payload: {
                count: 9
            }
        })

        expect(appDemo.getState()[model1Namespace].count).to.be.equal(9);
    });

    it('onError', function () {
        appDemo.dispatch({
            type: model1Namespace + '/throwError',
            payload: {
                error: 'error1'
            }
        })

        expect(err.message).to.be.equal('error1');
    });

    it('onError(async)', function (done) {
        appDemo.dispatch({
            type: model1Namespace + '/throwError2',
            payload: {
                error: 'error2'
            }
        })
        setTimeout(()=>{
            expect(err.message).to.be.equal('error2');
            done()
        },101)

    });
});



// describe('createApp with initialState ', function () {
//     it('check state', function () {
//         const app=createApp({
//             initialState:{
//                 [model1Namespace]:{
//                     name:'jack'
//                 }
//             }
//         })
//
//         expect(app.getState()[model1Namespace].name).to.be.equal('jack');
//     });
// });




