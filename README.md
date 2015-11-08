# speech
公司内部小项目－用于计算每个人演讲得分和排名

## 实现接口  
* /login            登入                    post    {user: xxx}
* /api/saveScore    保存得分                post    {to:xxx, xx: 1, ..} 
* /api/rank         获取全部人员的得分      get                                     {xx: xxx}
* /api/random       随机所有用户的order     get                                     {xx: xxx}
* /api/order        获取当前用户的order值   get                                     {order: xxx}


## 说明  
暂时准备放到[letshareba.com](letshareba.com)上。  
端口为 8082   

目前能登陆的帐号只有 flyover, cc, xiaose ..


看一下配置文件吧。
````
{
    "port": 8082,
    "skills": ["time", "describe", "imagery", "harvest", "all"], 
    "users": ["flyover", "boringwind", "xiaose", "zhaoge", "cc"]
}
````
