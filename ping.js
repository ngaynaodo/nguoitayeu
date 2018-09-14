function a(bug, key){
    if(bug>20) return;
    var url = 'http://'+ key+ '.herokuapp.com/fb?q=dieptiep'
    require('request').get(url, function(err, resp, data){
        if(data) {
            try{
                var x = JSON.parse(data);
                if(typeof(x.iAmRun)!='undefined'){
                    setInterval(function(){
                        a(bug, key);
                    }, 2000);
                } else throw new Error('json iAmRun empty');
            }
            catch(ex){
                setInterval(function(){
                    a(++bug, key);
                }, 2000);
            }
        }
    })
}
['vidvivu', 'phimvu', 'hongkongem', 'conanhzai',
	'testkext', 'ngaynaodo', 'xinhcentimet', 'chuonchuonot',
	'chotoimotngay', 'phoxinh'].forEach(function(el){
    a(0, el);
})
