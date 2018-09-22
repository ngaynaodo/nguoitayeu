var firebase = require('../routes/123').firebase;

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

var database = require('../deploy/bigphim2-export.json');
async function sleep(s) {
    return new Promise(r=>{
        setTimeout(r, 1000*s);
    })
};

var backup = require('../routes/gd/proApi');
async function backupPromise(id, data){
    return new Promise(function(solve){
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
    })
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
    for(var i in database){
        var tmp= await fireget(i);
        if(tmp) {
            console.log('da upload:', i);
            continue;
        }
        var el = database[i];
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
        if(!url) continue;
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
            if(!url) continue;
            a = await api(url);
        }
        if(a.data){
            console.log(i, a.data.length, url);
            console.time(i);
            var c= await backupPromise(i, a.data);
            console.timeEnd(i);
            if(c.data){
                console.log(c.data);
                await firebase.database().ref('bigphim2').child(i).child('gd').update(c.data);
            }
        } else {
            console.log('link die');
            console.log(urlO, urlR);
            continue;
        }
        await sleep(5);
    }
})();
