const jwt = require('jsonwebtoken');
const {ACCESS_TOKEN_SECRET,REFRESH_TOKEN_SECRET} = require('../config/index');
const RefreshToken = require('../models/token')
class JWTService{
    // sign access token
   static signAccessToken(payload,expirytime){
        return jwt.sign(payload,ACCESS_TOKEN_SECRET,{expiresIn:expirytime});
    }
    // sign refresh token
   static signRefreshToken(payload,expirytime){
        return jwt.sign(payload,REFRESH_TOKEN_SECRET,{expiresIn:expirytime});
    }
    // verify access token 
   static VerifyAccessToken(token){
        return jwt.verify(token,ACCESS_TOKEN_SECRET);
    }
    // verify refresh token
    
   static VerifyRefreshToken(token){
        return jwt.verify(token,REFRESH_TOKEN_SECRET);
    }
    // store refresh token
  static async storeRefreshToken(token,userId){
          try{
               const newToken= new RefreshToken({
                token:token,
                userId:userId
               });
               await newToken.save();
          } catch(error){
            console.log(error)
          }
    }
}
module.exports= JWTService;