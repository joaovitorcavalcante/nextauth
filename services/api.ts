import axios, { AxiosError } from "axios";
import { parseCookies, setCookie } from "nookies";

let cookies = parseCookies();
let isRefreshing = false;
let failedRequestQueue = [];

export const api = axios.create({
  baseURL: "http://localhost:3333",
  headers: {
    Authorization: `Bearer ${cookies["nextauth.token"]}`,
  },
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    console.log(error.response);

    if (error.response.status === 401) {
      if (error.response.data.code === "token.expired") {
        cookies = parseCookies();

        const { "nextauth.refreshToken": refreshToken } = cookies;

        const originalConfig = error.config;

        if (!isRefreshing) {
          isRefreshing = true;

          api
            .post("/refresh", {
              refreshToken,
            })
            .then((response) => {
              console.log(response);

              const token = response.data;

              setCookie(undefined, "nextauth.token", token, {
                maxAge: 60 * 60 * 24 * 30, // 30 days
              });

              setCookie(
                undefined,
                "nextauth.refreshToken",
                response.data.refreshToken,
                {
                  maxAge: 60 * 60 * 24 * 30, // 30 days
                }
              );

              api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

              failedRequestQueue.forEach((request) => request.onSucess(token));
              failedRequestQueue = [];
            })
            .catch((err) => {
              failedRequestQueue.forEach((request) => request.onFailure(err));
              failedRequestQueue = [];
            })
            .finally(() => {
              isRefreshing = false;
            });
        }

        return new Promise((resolve, reject) => {
          failedRequestQueue.push({
            onSucess: (token: string) => {
              originalConfig.headers.common[
                "Authorization"
              ] = `Bearer ${token}`;

              resolve(api(originalConfig));
            },
            onFailure: (err: AxiosError) => {
              reject(err);
            },
          });
        });
      } else {
      }
    }
  }
);
