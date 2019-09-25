import { c1Url } from "./../../config";

interface PostResult {
  result: string;
  message: string;
  elementIds: string[];
}

export class Http {
  baseUrl: string = c1Url;

  async get<T>(url: string): Promise<T> {
    console.log('[HTTP GET] ', url);
    return fetch(this.baseUrl + url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        return response.json() as Promise<{ data: T }>;
      })
      .then(data => {
        console.log('[HTTP GET RESULT] ', url, data);
        return data.data;
      });
  }

  async put(url: string, _body: any) {
    return this.putOrPost(url, _body, 'PUT');
  }

  async post(url: string, _body: any) {
    return this.putOrPost(url, _body, 'POST');
  }

  async putOrPost(url: string, _body: any, _method: string): Promise<string> {
    console.log('[HTTP POST] ', url, _body, _method);
    return fetch(this.baseUrl + url, {
      method: _method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(_body)
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        return response.json() as Promise<PostResult>;
      })
      .then(result => {
        console.log('[HTTP POST RESULT] ', url, _body, _method, result);
        if (result.elementIds != null) {
          return result.elementIds[0];
        }
        return null;
      });
  }
}

export const http = new Http();
