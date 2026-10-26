import { ADSCORE_ZONE_API_KEY } from "./variables";
import { getCookieName } from "./cookie-name";

/**
 * Response templates
 */
export class AdscoreResource {
  static screeningPage(
    signedRequest: string | undefined,
    apiKey: string = ADSCORE_ZONE_API_KEY,
  ) {
    const resolvedCookieName = getCookieName(apiKey);
    return new Response(
      `<html><body><script src="//c.adsco.re" type="text/javascript"></script>
  <script type="text/javascript">
    function sendData(url, data, callback) {
      var xhr;
      if (window.XMLHttpRequest)
        xhr = new XMLHttpRequest();
      else
        xhr = new ActiveXObject("Microsoft.XMLHTTP");
        xhr.open('POST', url, true);
        xhr.withCredentials = true;
        var xhrol = function(e) {
          if (callback)
            if (xhr.readyState != 4)
                callback(null, 2);
            else if (xhr.status != 200)  
              callback(xhr.responseText, 1, xhr.status);
            else
              callback(xhr.responseText, 0);
        }
        if ('onerror' in xhr)
            xhr.onerror = function() {
              if (callback) callback(null, 1)
            }
        if ('onload' in xhr)
            xhr.onload = xhrol;
        else if ('onreadystatechange' in xhr)
            xhr.onreadystatechange = xhrol;
        xhr.send(data);
    }
  
    function setCookie(cname, cvalue) {
      var d = new Date();
      d.setTime(d.getTime() + (6*60*60*1000));
      var expires = "expires="+ d.toUTCString();
      document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    }
  
    if (typeof AdscoreInit !== "function") 
      alert('Please disable Adblock to access this page.'); 
    else if (!navigator.cookieEnabled) 
      alert('This website require cookies.'); 
    else
      AdscoreInit("` +
        apiKey +
        `", {
          request_signature: ${
            signedRequest ? `"${signedRequest}"` : "undefined"
          },
          callback: function(result) {
          if (result.signature == '') {
            if(result.status === "error"){
              alert('Error from Adscore: ' + result.message);
            } else {
              alert('Please disable Adblock to access this page.'); 
            }
          }
          else
            sendData(document.location.href, result.signature, function(data, status, httpCode) {
              if (status == 2)
                return true;
              /* TODO: Handling 403 errors caused by immediate signature validation */
              if ((status == 1) || (data == '')) {
                alert('Cannot connect to Adscore service. Status: ' + status + ", HTTP Code: " + httpCode + ", Data: " + data);
                return false;
              } 
              setCookie('` + resolvedCookieName + `', data);
              if ((document.cookie.indexOf('` + resolvedCookieName + `=') > -1)) {
                sendData("?AdscoreCookieCheck", Date.now(), function(d, s, hc) {
                  if ((s == 0) && (d.localeCompare("OK") == 0))
                    document.location.replace(document.location.href);  
                  else {
                    /* TODO: Handle errors caused by not keeping the cookie */
  //                  alert('Your browser has dodgy cookie support (2).');
                  }   
                });
              } //else
                //alert('Your browser has dodgy cookie support (1).');
            });
        }
      });
  </script></body></html>`,
      {
        status: 200,
        statusText: "OK",
        headers: {
          "Content-Type": "text/html",
          Link: "<//c.adsco.re>;rel=prefetch,<//adsco.re>;rel=preconnect,<//6.adsco.re>;rel=prefetch",
          "Cache-Control": "no-cache, no-store, must-revalidate, no-transform",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }

  static refreshPage(signature: string, apiKey: string = ADSCORE_ZONE_API_KEY) {
    const resolvedCookieName = getCookieName(apiKey);
    var d = new Date();
    d.setTime(d.getTime() + 6 * 60 * 60 * 1000);
    var expires = "Expires=" + d.toUTCString();
    return new Response(signature, {
      status: 200,
      statusText: "OK",
      headers: {
        "Content-Type": "text/html",
        "Set-Cookie":
          resolvedCookieName + "=" +
          encodeURIComponent(signature) +
          "; " +
          expires +
          "; Path=/;",
        "Cache-Control": "no-cache, no-store, must-revalidate, no-transform",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  }

  static blockPage(htmlOutput?: boolean, errorMessage?: string) {
    if (htmlOutput)
      return new Response(
        errorMessage ||
          `<html><body>Access blocked by <a href="https://www.adscore.com">Adscore</a>, because we believe you might not be a human visitor or you are connecting via proxy or VPN.</body></html>`,
        {
          status: 403,
          statusText: "Forbidden",
          headers: {
            "Content-Type": "text/html",
          },
        }
      );
    else
      return new Response(errorMessage || "", {
        status: 403,
        statusText: "Forbidden",
      });
  }

  static okPage(request: any) {
    return new Response(`OK`, {
      status: 200,
      statusText: "OK",
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-cache, no-store, must-revalidate, no-transform",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  }

  static p3pXmlFull(request: any) {
    /*
        If you plan to introduce your own p3p xml under /w3c/Full_P3P_Policy.xml, uncomment following lines
      */
    //let response = await fetch(request);
    //return response;
    return new Response(
      `<?xml version="1.0"?><POLICIES xmlns="http://www.w3.org/2002/01/P3Pv1"><EXPIRY date="Wed, 01 Jan 2020 12:00:00 GMT"/><POLICY name="AdScore" discuri="https://www.adscore.com/privacy-policy.html" xml:lang="en"><ENTITY><DATA-GROUP><DATA ref="#business.name">Tomksoft S.A</DATA><DATA ref="#business.contact-info.online.email">support@adscore.com</DATA><DATA ref="#business.contact-info.online.uri">http://adscore.com</DATA><DATA ref="#business.contact-info.telecom.telephone.number">305-492-7735</DATA><DATA ref="#business.contact-info.postal.organization">Tomksoft S.A.</DATA><DATA ref="#business.contact-info.postal.street">75 meters west of park</DATA><DATA ref="#business.contact-info.postal.city">San Pablo de Heredia</DATA><DATA ref="#business.contact-info.postal.stateprov">Heredia</DATA><DATA ref="#business.contact-info.postal.postalcode">3019</DATA><DATA ref="#business.contact-info.postal.country">Costa Rica</DATA></DATA-GROUP></ENTITY><ACCESS><contact-and-other/></ACCESS><DISPUTES-GROUP><DISPUTES resolution-type="service" service="https://www.adscore.com/support" short-description="General"><LONG-DESCRIPTION></LONG-DESCRIPTION><REMEDIES><correct/></REMEDIES></DISPUTES></DISPUTES-GROUP><STATEMENT><EXTENSION optional="yes"><GROUP-INFO xmlns="http://www.software.ibm.com/P3P/editor/extension-1.0.html" name="Panel information"/></EXTENSION><PURPOSE><admin/><contact/><current/><develop/><pseudo-analysis/><pseudo-decision/><individual-analysis/><individual-decision/><tailoring/><historical/><telemarketing/></PURPOSE><RECIPIENT><ours/></RECIPIENT><RETENTION><business-practices/></RETENTION><DATA-GROUP><DATA ref="#dynamic.clickstream"/><DATA ref="#dynamic.http"/><DATA ref="#dynamic.cookies"><CATEGORIES><navigation/><state/><uniqueid/></CATEGORIES></DATA><DATA ref="#user.name"/><DATA ref="#user.business-info"/><DATA ref="#dynamic.miscdata"><CATEGORIES><online/></CATEGORIES></DATA><DATA ref="#dynamic.miscdata"><CATEGORIES><financial/></CATEGORIES></DATA><DATA ref="#dynamic.miscdata"><CATEGORIES><computer/></CATEGORIES></DATA><DATA ref="#dynamic.miscdata"><CATEGORIES><navigation/></CATEGORIES></DATA><DATA ref="#dynamic.miscdata"><CATEGORIES><location/></CATEGORIES></DATA><DATA ref="#dynamic.miscdata"><CATEGORIES><state/></CATEGORIES></DATA><DATA ref="#dynamic.miscdata"><CATEGORIES><demographic/></CATEGORIES></DATA></DATA-GROUP></STATEMENT><STATEMENT><EXTENSION optional="yes"><GROUP-INFO xmlns="http://www.software.ibm.com/P3P/editor/extension-1.0.html" name="Adserving information"/></EXTENSION><PURPOSE><admin/><current/><develop/><pseudo-analysis/><pseudo-decision/></PURPOSE><RECIPIENT><ours/></RECIPIENT><RETENTION><indefinitely/></RETENTION><DATA-GROUP><DATA ref="#dynamic.clickstream"/><DATA ref="#dynamic.http"/><DATA ref="#dynamic.clientevents"/><DATA ref="#dynamic.cookies"><CATEGORIES><navigation/><state/><uniqueid/></CATEGORIES></DATA><DATA ref="#dynamic.searchtext"/><DATA ref="#dynamic.miscdata"><CATEGORIES><uniqueid/></CATEGORIES></DATA><DATA ref="#dynamic.miscdata"><CATEGORIES><state/></CATEGORIES></DATA><DATA ref="#dynamic.miscdata"><CATEGORIES><location/></CATEGORIES></DATA><DATA ref="#dynamic.miscdata"><CATEGORIES><demographic/></CATEGORIES></DATA></DATA-GROUP></STATEMENT></POLICY></POLICIES>`,
      {
        status: 200,
        statusText: "OK",
        headers: {
          "Content-Type": "text/xml",
        },
      }
    );
  }

  static p3pXmlEntry(request: any) {
    /*
        If you plan to introduce your own p3p xml under /w3c/p3p.xml, uncomment following lines
      */
    //let response = await fetch(request);
    //return response;
    return new Response(
      `<?xml version="1.0"?><META xmlns="http://www.w3.org/2000/12/p3pv1"><POLICY-REFERENCES><POLICY-REF about="Full_P3P_Policy.xml"><INCLUDE>\*</INCLUDE><COOKIE-INCLUDE name="*" value="*" domain="*" path="*"/></POLICY-REF></POLICY-REFERENCES></META>`,
      {
        status: 200,
        statusText: "OK",
        headers: {
          "Content-Type": "text/xml",
        },
      }
    );
  }
}
