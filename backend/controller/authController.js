const Joi= require('joi');
const bcrypt = require('bcryptjs');
const { default: mongoose } = require('mongoose');
const User = require('../models/user');
const UserDTO = require('../dto/user');
const JWTService = require('../sevices/JWTservice')
const RefreshToken = require('../models/token');
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,25}$/;
const authController = {
    async register(req,res,next){
         //validate user input
         const userRegisterSchema = Joi.object({
            username: Joi.string().min(5).max(30).required(),
            name: Joi.string().max(30).required(),
            email: Joi.string().email().required(),
            password: Joi.string().pattern(passwordPattern).required(),
            confirmPassword: Joi.ref('password')
         })

         const {error}= userRegisterSchema.validate(req.body);
        
        if(error){
          return next(error);
        }

        const {username,name,email,password} = req.body;
        try {
          const emailInUse = await User.exists({email});
          const usernameInUse = await User.exists({username});
          if(emailInUse){
            const error = {
              status : 409,
              message :  'Email already in use'
            }
            return next(error);
          }
          if(usernameInUse){
            const error = {
              status : 409,
              message :  'username already in use'
            }
            return next(error);
          }
        }
        catch(error) {
          return next(error);
        } 
// password hash
              const hashedPassword= await bcrypt.hash(password,10);
              // store user in db
              let accessToken;
              let refreshToken;
              let user;
              try {
                const userToRegister = new User({
                  username: username,
                  email: email,
                  name,                      // shorthand for name:name
                  password: hashedPassword
                 })
                 user = await userToRegister.save(); 
                 // token generation
                 accessToken = JWTService.signAccessToken({ _id: user._id}, '30m');
                 refreshToken = JWTService.signRefreshToken({ _id: user._id}, '60m');
              } catch (error) {
                return next(error);
              }

              //store refresh token
              await JWTService.storeRefreshToken(refreshToken, user._id)

              // send tokens in cookies
              res.cookie('accessToken',accessToken,{
                maxAge: 1000*60*60*24,
                httpOnly: true
              });
              
              res.cookie('refreshToken',refreshToken,{
                maxAge: 1000*60*60*24,
                httpOnly: true
              });
       //response send
       const userDto = new UserDTO(user);
        
          return res.status(201).json({user: userDto, auth: true})
       },



    async login(req,res,next){
                  // validate user input
                  const userLoginSchema = Joi.object({
                    username: Joi.string().min(5).max(30).required(),
                    password: Joi.string().pattern(passwordPattern).required(),
                 })

                 const {error} = userLoginSchema.validate(req.body);
                  // if validation eror , return error
                  if(error){
                    return next(error);
                  }
                  
                  // match username and passwor
                  const {username,password} = req.body;
                  let user;
                  
             
                  try{
                     user =  await User.findOne({username});
                    if(!user){
                      console.error('Login attempt with invalid username:', username); // Log the invalid attempt
  
                      const error = {
                        status : 401,
                        message: 'invalid username'
                      }
                      return next(error);
                    }

                  const match = await bcrypt.compare(password, user.password);
                   
                  if(!match){
                    const error = {
                      status: 401,
                      message: 'invalid password'
                    }
                    return next(error);
                  }
               
                  }
                  catch(error){
                     return next(error);
                  }

                 const accessToken = JWTService.signAccessToken({ _id: user._id}, '30m');
                 const refreshToken = JWTService.signRefreshToken({ _id: user._id}, '60m');

                     //store refresh token
              JWTService.storeRefreshToken(refreshToken, user._id)
              // update refresh token in db
               try{
                await RefreshToken.updateOne(
                  { _id: user._id
                  }, {token: refreshToken},
                  {upsert: true}
                )
               }
               catch(error){
                return next(error);
               }
              // send tokens in cookies
              res.cookie('accessToken',accessToken,{
                maxAge: 1000*60*60*24,
                httpOnly: true
              });
              
              res.cookie('refreshToken',refreshToken,{
                maxAge: 1000*60*60*24,
                httpOnly: true
              });
                  
                  const userDto = new UserDTO(user);
                  // return response
                  return res.status(200).json({user: userDto, auth: true})
    },

    async logout(req,res,next){
       const {refreshToken}= req.cookies;
       try{ 
       
            await RefreshToken.deleteOne({token: refreshToken});
            

       } catch(error){
        return next(error);
       }
       res.clearCookie('accessToken');
       res.clearCookie('refreshToken');
       res.status(200).json({ user: null, auth: false });
    }, 
    async refresh(req,res,next){
      // get refresh token from cookies
      // verify refres token
      // generate new tokens
      // update dp and return a response

      const originalRefreshToken = req.cookies.refreshToken;

      let id;

      try{
id = JWTService.VerifyRefreshToken(originalRefreshToken)._id;
      }
      catch(e){
        const error ={
          status: 401,
          message: 'unauthorized'
        }
        return next(error);
      }
      // find user by id
      try{
        const match = RefreshToken.findOne({_id: id,token: originalRefreshToken});
        if(!match){
          const error ={
            status: 401,
            message: 'unauthorized'
          }
          return next(error);
        }
        }
        catch(e){
          return next(e);
        }

        try{
          const accessToken= JWTService.signAccessToken({_id: id}, '30m');

          const refreshToken = JWTService.signRefreshToken({_id: id}, '60m');
          RefreshToken.updateOne({_id:id}, {token: refreshToken} );
          res.cookie('accessToken', accessToken, { httpOnly: true, maxAge: 1000*60*60*24})
    
          res.cookie('refreshToken', refreshToken, { httpOnly: true, maxAge: 1000*60*60*24})
        }
        catch(e){
          return next(e);
        }
        const user = await User.findOne({_id: id});
        const userDto = new UserDTO(user);
        return res.status(200).json({user: userDto,auth: true});
      }
    }

module.exports = authController;