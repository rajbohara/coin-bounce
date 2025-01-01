const Joi = require('joi');
const fs = require('fs');
const path = require('path');
const Blog = require('../models/blog');
const { BACKEND_SERVER_PATH } = require('../config/index');
const BlogDTO = require('../dto/blog');
const BlogDetailsDTO = require('../dto/blog-details')
const Comment = require("../models/comment");

const mongodbIdPattern = /^[0-9a-fA-F]{24}$/;

const blogController = {
  async create(req, res, next) {
    // 1. Validate body
    const createBlogSchema = Joi.object({
      title: Joi.string().required(),
      author: Joi.string().regex(mongodbIdPattern).required(),
      content: Joi.string().required(),
      photo: Joi.string().required(), // Base64 encoded string
    });

    const { error } = createBlogSchema.validate(req.body);
    if (error) {
      return next(error); // Pass validation errors to the error handler
    }

    const { title, author, content, photo } = req.body;

    // 2. Handle photo storage
    const buffer = Buffer.from(
      photo.replace(/^data:image\/(png|jpg|jpeg);base64,/, ''),
      'base64'
    );

    const imagePath = `${Date.now()}-${author}.png`;

    // Ensure the storage directory exists
    const storagePath = path.join(__dirname, '../storage');
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath);
    }

    try {
      fs.writeFileSync(`storage/${imagePath}`, buffer);
    } catch (error) {
      return next(error);
    }

    // 3. Save blog in database
    let newBlog;
    try {
      newBlog = new Blog({
        title,
        author,
        content,
        photoPath: `${BACKEND_SERVER_PATH}/storage/${imagePath}`,
      });
      await newBlog.save();
    } catch (error) {
      return next(error);
    }

    // 4. Return response
    const blogDto = new BlogDTO(newBlog);
    return res.status(201).json({ blog: blogDto });
  },

  async getAll(req, res, next) {
    try {
       const blogs = await Blog.find({});

       const blogsDto = [];
       for(let i=0;i<blogs.length;i++){
        const dto = new BlogDTO(blogs[i]);
        blogsDto.push(dto);
       }
       return res.status(200).json({blogs: blogsDto});
    } catch (error) {
      return next(error);
    }
  },
  async getById(req, res, next) {
    // validate id
    // response

    const getByIdSchema = Joi.object({
      id: Joi.string().regex(mongodbIdPattern).required(),
    });

    const { error } = getByIdSchema.validate(req.params);

    if (error) {
      return next(error);
    }

    let blog;

    const { id } = req.params;

    try {
      blog = await Blog.findOne({ _id: id }).populate('author');
    } catch (error) {
      return next(error); 
    }

    const blogDto = new BlogDetailsDTO(blog);

    return res.status(200).json({ blog: blogDto});
 
  },
  async update(req, res, next) {
    // validate
    //

    const updateBlogSchema = Joi.object({
      title: Joi.string().required(),
      content: Joi.string().required(),
      author: Joi.string().regex(mongodbIdPattern).required(),
      blogId: Joi.string().regex(mongodbIdPattern).required(),
      photo: Joi.string(),
    });

    const { error } = updateBlogSchema.validate(req.body);

    const { title, content, author, blogId, photo } = req.body;

    // delete previous photo
    // save new photo

    let blog;

    try {
      blog = await Blog.findOne({ _id: blogId });
    } catch (error) {
      return next(error);
    }

    if (photo) {
      let previousPhoto = blog.photoPath;

      previousPhoto = previousPhoto.split("/").at(-1);     
      /* previousPhoto.split("/") results in:
javascript
Copy code
["https:", "", "example.com", "images", "photo.jpg"]
.at(-1) extracts "photo.jpg". */

      // delete photo
      fs.unlinkSync(`storage/${previousPhoto}`);
/*
A method from Node.js's built-in fs (File System) module.
It deletes the file at the specified path.
The synchronous version blocks the execution of further code until the file is deleted.
If the file does not exist or an error occurs during deletion, it throws an exception. 
*/
      // read as buffer
       const buffer = Buffer.from(
         photo.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""),
         "base64"
     );
     /* 
        Buffer.from(rawData, "base64"):

Converts the stripped Base64 string (rawData) into a Buffer object.
The "base64" argument specifies the encoding format of the input string.
     */

      // allot a random name
       const imagePath = `${Date.now()}-${author}.png`;

      // save locally
   //   let response;
      try {
   //     response = await cloudinary.uploader.upload(photo);
         fs.writeFileSync(`storage/${imagePath}`, buffer);
      } catch (error) {
        return next(error);
      }

      await Blog.updateOne(
        { _id: blogId },
        {
          title,
          content,
          photoPath: `${BACKEND_SERVER_PATH}/storage/${imagePath}`
        }
      );
    } else {
      await Blog.updateOne({ _id: blogId }, { title, content });
    }

    return res.status(200).json({ message: "blog updated!" });
  },
  async delete(req, res, next) {
    
    // validate id
    // delete blog
    // delete comments on this blog

    const deleteBlogSchema = Joi.object({
      id: Joi.string().regex(mongodbIdPattern).required(),
    });

    const { error } = deleteBlogSchema.validate(req.params);

    const { id } = req.params;

    // delete blog
    // delete comments
    try {
      await Blog.deleteOne({ _id: id });

      await Comment.deleteMany({ blog: id });
    } catch (error) {
      return next(error);
    }

    return res.status(200).json({ message: "blog deleted" });
  },
};

module.exports = blogController;
