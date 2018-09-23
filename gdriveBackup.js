var firebase = require('../routes/123').firebase;

// ly do toi viet lai code:
/*  https://medium.com/front-end-hacking/async-await-is-not-about-making-asynchronous-code-synchronous-ba5937a0c11e
    Async / await can slow down your code
*/

async function fireget(id){
    return new Promise((r, ej)=>{
        firebase.database().ref('bigphim2').child(id).child('gd').once('value', function(s){
            var a = s.val();
            if(!a) r(undefined);
            else r(a);
        }).catch(function(ex){
            ej(ex);
        })
    })
}

const database = require('../deploy/bigphim2-export.json');
const COUNT= 5;
var totalCount = 0;
const objK = Object.keys(origins);
function getNextVal(jobs, chiso){
    delete jobs[chiso];
    var newThuoctinh = objK[totalCount];
    if(newThuoctinh){
        var slot = {}; slot[ newThuoctinh ] = origins[newThuoctinh];
        jobs.push(slot);
        return totalCount;
    } return undefined;
}

async function sleep(s) {
    return new Promise(r=>{
        setTimeout(r, 1000*s);
    })
};

var backup = require('../routes/gd/proApi');
function backupCb(id, data, solve){
    backup({ id: id, leech: data , debug: false}, function(location, err, res){
        if(err) {
            if(location || res){
                var a = {
                    location: (location) ? location: null,
                    res: (res)? res: null
                };
                solve({data: a});
            } else solve({err});
        }
        else solve({data: res});
    });
}
async function openload(url){
    return new Promise(function(solve){
        require('../fb/openloadApi')(url, function(err, data){
            if(err) solve({err});
            else solve({data});
        })
    })
}
async function rapid(url){
    return new Promise(function(solve){
        require('../fb/rapidApi')(url, function(err, data){
            if(err) solve({err});
            else solve(data);
        })
    })
}
(async ()=>{
    var countLink = 0;
    var listJob = [];
    for(var idPhim in database){
        var tmp= await fireget(idPhim);
        if(tmp) {
            console.log('da upload:', idPhim);
            continue;
        }
        var el0 = {}; el0[idPhim]= database[idPhim];
        listJob.push(el0);
        //if(listJob.length<5) continue;
        if(listJob.length<COUNT && objK.indexOf(idPhim)!= (objK.length- 1)) continue;
        var jobs = listJob.slice(0, listJob.length);
        listJob= [];
        var jobsCount = 0;
        for(var j in jobs){
            function respAuto(tick){
                var nextSession = getNextVal(jobs,tick);
                if(nextSession){
                    myThread(nextSession);
                } else jobsCount++;
                return tick;
            }
            // j la bien toan cuc, nen phai gan tick= j
            async function myThread (tick){ // de async de chay cac ham await
                totalCount++;
                var i = Object.keys(jobs[tick])[0];
                var el = jobs[tick][i];
                
                var x, y, urlO, urlR, url;
                x = el.url || ''; y = el.url2 || '';
                if(x.includes('/openload.co/')) urlO = x;
                else if(x.includes('/www.rapidvideo.com/')) urlR=x;
                if(y.includes('/openload.co/')) urlO = y;
                else if(y.includes('/www.rapidvideo.com/')) urlR=y;
                if( (countLink++)%4 === 3 ){
                    countLink=0;
                    url = urlO;
                } else url= urlR;
                if(!url) return respAuto(tick);
                var api= (url==urlO) ? openload : rapid;
                var a = await api(url);
                if(!a.data){
                    // dao lai
                    if(url==urlO) {
                        url= urlR;
                        api = rapid;
                    } else {
                        url= urlO;
                        api = openload;
                    }
                    if(!url) return respAuto(tick);
                    a = await api(url);
                }
                if(a.data){
                    console.log(i, a.data.length, url);
                    console.time(i);
                    backupCb(i, a.data, function(c){
                        console.timeEnd(i);
                        if(c.data){
                            console.log(c.data);
                            firebase.database().ref('bigphim2').child(i).child('gd').update(c.data);
                        }
                        return respAuto(tick);
                    });
                } else {
                    console.log('link die');
                    console.log(urlO, urlR);
                    await firebase.database().ref('bigphim404').child(i).update(el);
                    return respAuto(tick);
                }
            }
            myThread(j).catch(function(exjob){
                console.error(exjob);
                process.exit();
            });
        }
        while(jobsCount< jobs.length){
            await sleep(0.7);
        }
        console.log('thoat khoi while');
        return;
    }
})().catch(function(exMain){
    console.error(exMain);
});
