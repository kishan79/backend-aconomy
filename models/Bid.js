// bookModel.find(
//   {
//     $or: [
//       { author: { $regex: req.query.dsearch } },
//       { books: { $regex: req.query.dsearch } },
//     ],
//   },
//   (err, data) => {
//     if (err) {
//       console.log(err);
//     } else {
//       res.render("pages/home", { data: data });
//     }
//   }
// );
