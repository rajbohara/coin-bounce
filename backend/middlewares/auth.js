const JWTService = require('../sevices/JWTservice')
const User = require('../models/user')
const UserDTO = require('../dto/user')

const auth = async (req, res, next) => {
    try {
      
    const {accessToken, refreshToken} = req.cookies;
    if (!accessToken || !refreshToken) {
       
        const error = {
            status: 401,
            message: 'Unauthorized'
        }
        return next(error);
     }
     let _id;
     try{
        _id =   JWTService.VerifyAccessToken(accessToken) // returns payload
     }
     catch(error){
        return next(error)
     }
   
      let user;
      try{
        user = await User.findOne({_id: _id});
      } 
     
      catch(error){
        return next(error)
      }
      const userDto = new UserDTO(user);
      
      req.user= userDto;
   
      next();

    }
    catch(error){
        return next(error);
    }
}
module.exports = auth;