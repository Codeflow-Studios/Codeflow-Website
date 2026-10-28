import { request } from 'node:http';

const prefix = '/admin/erp';
export const isErpPath = path => path === prefix || path.startsWith(prefix + '/');
const sessionCookie = req => req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('__Host-codeflow_admin='))?.slice('__Host-codeflow_admin='.length);

export function createErpProxy({env,sessions,now=Date.now}) {
  let upstream,origin;
  try {
    const target=new URL(env.FLOWERP_UPSTREAM),host=target.hostname.toLowerCase();
    if(target.protocol==='http:'&&!target.username&&!target.password&&target.pathname==='/'&&!target.search&&!target.hash&&(host.endsWith('.railway.internal')||['127.0.0.1','localhost','[::1]'].includes(host)))upstream=target;
  } catch { /* Missing configuration stays closed. */ }
  try { const parsed=new URL(env.ADMIN_ORIGIN);if(parsed.protocol==='https:'&&parsed.origin===env.ADMIN_ORIGIN)origin=parsed; } catch { /* Invalid origin stays closed. */ }
  const key=env.FLOWERP_GATEWAY_KEY;
  const ready=Boolean(upstream&&origin&&typeof key==='string'&&key.length>=32&&key.length<=256&&!/[\x00-\x20\x7f]/.test(key));
  return {
    handle(req,res) {
      let pathname;
      try { pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/\\/g,'/'); }catch{res.writeHead(400).end();return;}
      if(!isErpPath(pathname)){res.writeHead(404).end();return;}
      const id=sessionCookie(req),session=id&&sessions.get(id);
      // SiteGround redirects the .be entry here. Permit real top-level page
      // navigation while continuing to isolate API, asset and write requests.
      const navigation=req.method==='GET'&&req.headers['sec-fetch-mode']==='navigate'&&req.headers['sec-fetch-dest']==='document'&&!/^\/admin\/erp\/(api|_next)(\/|$)/.test(pathname);
      if(!origin||req.headers.host!==origin.host||!session||session.expires<=now()||(req.headers['sec-fetch-site']==='cross-site'&&!navigation)||(req.headers.origin&&req.headers.origin!==origin.origin)||(!['GET','HEAD'].includes(req.method)&&req.headers.origin!==origin.origin)){
        res.writeHead(403).end('Ongeldige aanvraag.');return;
      }
      if(!ready){res.writeHead(503).end('ERP is nog niet gekoppeld.');return;}
      const headers={...req.headers};
      for(const name of Object.keys(headers))if(name==='forwarded'||name.startsWith('x-forwarded-')||name.startsWith('x-codeflow-erp-')||['host','authorization','proxy-authorization','cookie','x-workspace-id'].includes(name))delete headers[name];
      headers.host=upstream.host;headers['x-codeflow-erp-key']=key;headers['x-forwarded-proto']='https';headers['x-forwarded-host']=origin.host;
      const proxy=request({hostname:upstream.hostname.replace(/^\[|\]$/g,''),port:upstream.port||80,path:req.url,method:req.method,headers},response=>{
        const safe={...response.headers};delete safe['x-codeflow-erp-key'];delete safe['set-cookie'];safe['cache-control']='no-store, private';
        res.writeHead(response.statusCode||502,safe);response.pipe(res);
      });
      proxy.setTimeout(30000,()=>proxy.destroy());
      proxy.on('error',()=>{if(!res.headersSent)res.writeHead(503).end('ERP is tijdelijk niet beschikbaar.');else res.destroy();});
      req.on('aborted',()=>proxy.destroy());res.on('close',()=>proxy.destroy());req.pipe(proxy);
    }
  };
}
