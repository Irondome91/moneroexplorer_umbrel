export class NodeService {
  private static fallbackNode = "http://10.21.21.179:18089"; //hardcoded umbrel default node using restricted rpc port
  private static cache: Map<string, { data: any }> = new Map();

  static getNode(){
    let address = Deno.env.get("NODE") ?? this.fallbackNode;
    if (!address.startsWith("http://") && !address.startsWith("https://")) {
      address = "http://" + address;
    }
    address = address.endsWith("/") ? address.slice(0, -1) : address;
   
    return { 
      address,
      rpcUsr: Deno.env.get("RPCUSR") ?? "",
      rpcPwd: Deno.env.get("RPCPWD") ?? ""
    }
  }

  static getCache(method: string) {
    const res = this.cache.get(method);
    return res ? res.data : null
  }

  static getAge(timestamp: string | number | Date): number {
    const pastTime: number = new Date(Number(timestamp) * 1_000).getTime();
    const nowTime: number = Date.now();
    if (isNaN(pastTime)) {
      throw new Error('Invalid timestamp provided');
    }
    const diffMs: number = nowTime - pastTime;
    const diffSeconds: number = Math.round(diffMs / 1_000);
    return Math.max(0, diffSeconds);
  }

  static async make_json_rpc_request(
    method: string,
    params: any = {},
    retries: number = 3
  ): Promise<any> {
    try {
      const result = await this._make_json_rpc_request(method, params);
      return result;
    } catch (err) {
      if (retries < 1) {
        console.log(`failed repeatedly to issue ${method}`);
        throw err;
      }
      console.log(`${method} failed, retrying (${retries - 1} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 1_000));
      return await this.make_json_rpc_request(method, params, retries - 1);
    }
  }

  static async _make_json_rpc_request(method: string, params: any = {}): Promise<any> {
    const node = await NodeService.getNode();
    const url = `${node.address}/json_rpc`;
    if (Deno.env.get("DEBUG") === "1") {
      console.warn(`[+] querying ${url} (${method})`)
    }
    const headers = {"Content-Type": "application/json"};
    const payload = {
      jsonrpc: "2.0",
      method: method,
      params: ""
    };
    if (params) {
      payload.params = params;
    }
    const resp = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });
    const data = JSON.parse(await resp.text());
    this.cache.set(method, {
      data: data
    })
    return data
  }

  static async make_rpc_request(method: string, params: any = {}): Promise<any> {
    const node = await NodeService.getNode();
    const url = `${node.address}/${method}`;
    if (Deno.env.get("DEBUG") === "1") {
      console.warn(`[+] querying ${url}`)
    }
    const headers = {"Content-Type": "application/json"};
    const resp = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(params),
    });
    const data = JSON.parse(await resp.text());
    this.cache.set(method, {
      data: data
    })
    return data
  }
  
}
