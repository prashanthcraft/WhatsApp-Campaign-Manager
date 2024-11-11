import expressHandleBars from "express-handlebars";
import { helper } from "./template.helper";
import * as Handlebars from "handlebars";

export async function renderHandlebarTemplate(
  filepath: string,
  contentParams: any = {}
) {
  const hbs = expressHandleBars.create({
    helpers: helper,
    partialsDir: ["template/partials/"],
    layoutsDir: "template/layouts/",
    handlebars: Handlebars,
  });
  let output = await hbs.renderView(filepath, contentParams);
//   output = new Handlebars.SafeString(output);
  return output;
}
Handlebars.registerHelper("inc", function (value, options){return parseInt(value) + 1});