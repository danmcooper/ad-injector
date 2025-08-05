# Ad Injector Tool

This tool injects ads into any existing webpage using a bookmarklet. Hosted on GitHub Pages for HTTPS compatibility.

## Usage

1. Visit any webpage like Distractify or Cookie & Kate.
2. Click the bookmarklet (see below).
3. Click "Inject Ads" in the component that appears.
4. You can drag and drop the control in the page.
5. Click Reload to reload the page without the ads.

## Bookmarklet

Create a bookmark in your browser. Then for URL insert the following exactly:

javascript:(function(){var o=document.querySelector(".kargo-ad-injector-ui");if(o)o.remove();var ts=Date.now();fetch("https://danmcooper.github.io/ad-injector/index.html?"+ts).then(r=>r.text()).then(html=>{var d=new DOMParser().parseFromString(html,"text/html"),ui=d.querySelector(".kargo-ad-injector-ui");if(!ui)return;document.body.appendChild(ui);var link=document.createElement("link");link.rel="stylesheet";link.href="https://danmcooper.github.io/ad-injector/style.css?"+ts;document.head.appendChild(link);var s=document.createElement("script");s.src="https://danmcooper.github.io/ad-injector/script.js?"+ts;document.body.appendChild(s);});})();

Save the bookmark. Now when you're on the page, click the bookmark ("bookmarklet") to use injection control.

## Deployment

The files are on GitHub at
https://github.com/danmcooper/ad-injector

and hosted via GitHub Pages at:
https://danmcooper.github.io/ad-injector/
