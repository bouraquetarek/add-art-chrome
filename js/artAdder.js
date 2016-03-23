(function() {

  'use strict';

  /******************************************************************************/



  var currentExhibition;


  function getParentUrl() {
    var isInIframe = (parent !== window),
        parentUrl = window.location.href;

    if (isInIframe) {
        parentUrl = document.referrer;
    }
    return parentUrl;
  }

  var artAdder = {
    replacedCount : '',
    processAdNode : function (elem) {

       var goodBye = false
      //if (elem.offsetWidth < 2) goodBye = true 
      //if (elem.offsetHeight < 2) goodBye = true 
      if (elem.tagName !== 'IFRAME' 
          && elem.tagName !== 'IMG'
          && elem.tagName !== 'OBJECT'
          && elem.tagName !== 'A'
          && elem.tagName !== 'INS'
          ) goodBye = true 

      if ($(elem).data('replaced')) goodBye = true 
      $(elem).data('replaced', true)
      if (goodBye) return


      var that = this,exhibition

      artAdder.getExhibitionObj()
      .then(function (ex) {
        exhibition = ex
        return artAdder.getPieceI()
      })
      .then(function (pieceI) {
        var origW = elem.offsetWidth
        var origH = elem.offsetHeight
        var piece = exhibition.works[pieceI]

        var $wrap = $('<div>').css({
          width: origW,
          height: origH,
          position : 'relative'
        })
        var art  = document.createElement('a')
        art.href = piece.link || exhibition.link || 'http://addendum.kadist.org' 
        art.title = piece.title || exhibition.title + ' | replaced by Addendum'
        art.style.width = origW + 'px'
        art.style.height = origH + 'px'
        art.style.display = 'block'
        art.style.position = 'absolute'
        art.style.background = "url(" + piece.image + ")"
        art.style.backgroundSize = "cover"
        art.style.backgroundPosition = "left " + ['top', 'bottom', 'center'][( Math.floor(Math.random() * 3) )]
        art.style.backgroundRepeat = "no-repeat"

        $wrap.append(art)
        $(elem.parentElement).append($wrap)
        $(elem).remove()
      })



    /*

        var $wrap = $('<div>').css({
          width: origW,
          height: origH,
          position : 'relative',
          perspective : '1000px'
        })
        var $inner = $('<div>').css({
          width: '100%',
          height : '100%',
          position : 'absolute',
          transformStyle : 'preserve-3d',
          transform : 'translateZ(-'+(Math.ceil(origH/2))+'px)',
          transition : 'transform 0.5s'
        })

        var art  = document.createElement('a')
        art.href = exhibition.info.link 
        art.title = 'Replaced by Add-Art'
        art.style.width = ( origW - 4 ) + 'px'
        art.style.height = ( origH - 4 ) + 'px'
        art.style.display = 'block'
        art.style.position = 'absolute'
        art.style.background = "url(" + getImgSrc(exhibition.entries, bestSize[0], bestSize[1])  + ")"
        art.style.backgroundSize = "cover"
        art.style.backgroundRepeat = "no-repeat"
        art.style.webkitTransform = "rotateX(-90deg) translateZ("+Math.ceil(origH/2)+"px)"

        elem.style.webkitTransform = 'rotateY(0deg) translateZ('+(Math.ceil(origH/2))+'px)'
        elem.style.width = origW + 'px'
        elem.style.height = origH + 'px'
        elem.style.display = 'block'
        elem.style.position = 'absolute'

        var clone = $(elem).clone()
        $inner.append(art).append(clone)
        $wrap.append($inner)
        $(elem.parentElement).append($wrap)

        // rotate it
        setTimeout(function () {
          $inner.css('transform', "translateZ(-"+(Math.ceil(origH/2))+"px) rotateX(90deg)")
            setTimeout(function () {
              $(elem).remove()
              clone.remove()
            }, 500)
        }, 50)

      })
      */
      return true
    },
    getPieceI : function (){
      var topUrl = getParentUrl(),savedUrl,savedPieceI
      var d = Q.defer()
      artAdder.localGet('url')
      .then(function (url){
        savedUrl = url && url.url
        return artAdder.localGet('pieceI')
      })
      .then(function (pieceI) {
        savedPieceI = pieceI && pieceI.pieceI
        return artAdder.getExhibitionObj()
      })
      .then(function (ex){
        var pieceI = savedPieceI || 0
        if (!savedUrl) artAdder.localSet('url', topUrl)
        if (savedUrl === topUrl) return d.resolve(pieceI)

        // there's no pieceI - choose 0 
        if (!savedPieceI && savedPieceI !== 0) {
          artAdder.localSet('pieceI', pieceI)
          return d.resolve(pieceI)
        }

       // a new url
       pieceI++
       if (pieceI > ex.works.length - 1) {
         pieceI = 0
       }
       artAdder.localSet('url', topUrl)
       artAdder.localSet('pieceI', pieceI)
       return d.resolve(pieceI)
      }).done()
      return d.promise
    },
    exhibition : function (name) {
      return artAdder.setExhibition(name)
    },
    setExhibition : function (exhibition) {
      currentExhibition = Q(exhibition)
      artAdder.localSet('exhibitionUpdated', Date.now())
      return artAdder.localSet('exhibition', exhibition)
    },
    getExhibition : function () {
      if (currentExhibition) return currentExhibition
      var d = Q.defer()
      artAdder.localGet('exhibition')
      .then(function (exhibition) {
        currentExhibition = Q(exhibition.exhibition)
        d.resolve(exhibition.exhibition)
      })
      return d.promise
    },
    getExhibitionObj : function (){
      var exhibitions
      return artAdder.getAllExhibitions()
      .then(function (all){
        exhibitions = all 
        return artAdder.getExhibition()
      })
      .then(function (title){
        return R.find(R.propEq('title', title), exhibitions)
      })
    },
    chooseMostRecentExhibition : function () {
      artAdder.localGet('defaultShowData')
      .then(function (feeds) {
        var latest = feeds.defaultShowData[0].title
        artAdder.exhibition(latest)
      })
    },
    getCustomExhibitions : function (){
      var d = Q.defer()
      artAdder.localGet('customExhibitions')
      .then( function (obj){
        var customExhibitions = obj['customExhibitions'] || []
        d.resolve(customExhibitions.filter(function (e){ return e  })) // get rid of blanks 
      })
      return d.promise

    },
    getAllExhibitions : function () {
      var d = Q.defer()
      var exhibs = []
      artAdder.localGet('defaultShowData')
      .then(function (obj){
        exhibs = R.map(artAdder.addPropToObj('addendum', true), exhibs.concat(obj.defaultShowData))
        return artAdder.getCustomExhibitions()
      })
      .then(function (customExhibitions){
        d.resolve(exhibs.concat(customExhibitions).sort(artAdder.exhibitionsSort)) 
      })
      .done()
      return d.promise
    },
    addExhibition : function (customExhibition){
      return artAdder.getCustomExhibitions()
      .then( function (customExhibitions){
        customExhibitions.push(customExhibition)
        customExhibitions = R.uniq(customExhibitions)
        return artAdder.localSet('customExhibitions', customExhibitions)
      })
    },
    // abstract storage for different browsers
    localSet : function (key, thing) {
      var d = Q.defer()
      if (typeof chrome !== 'undefined') {
        var save = {}
        save[key] = thing
        chrome.storage.local.set(save, d.resolve)
      }
      return d.promise
    },
    localGet : function (key) {
      var d = Q.defer()
      if (typeof chrome !== 'undefined') {
        chrome.storage.local.get(key, d.resolve)
      }
      return d.promise
    },
    formatDate : function (t){
      var dateObj = new Date(t)
      var months = ["January","February","March","April","May","June","July","August","September","October","November","December"]
      var day = dateObj.getDate()
      var month = months[dateObj.getMonth()]
      var year = dateObj.getUTCFullYear()
      var date = month + ' ' + day + ', ' + year
      return date
    },
    verifyExhibition : function (exhib){
      return ['artist','description','title','thumbnail','works'].reduce(function (prev, curr){
        if (!prev) return prev 
        return exhib[curr] !== undefined
      }, true)
    },
    exhibitionsSort : function (a,b) {
      if (a.date > b.date) return -1
      if (a.date < b.date) return 1
      return 0
    },
    addPropToObj : R.curry(function (prop, fn){
      return function (obj) {
        return R.set(R.lensProp(prop), typeof fn === 'function' ? fn(obj) : fn, R.clone(obj))
      }
    })

  }

  

  window.artAdder = artAdder
  
})();


