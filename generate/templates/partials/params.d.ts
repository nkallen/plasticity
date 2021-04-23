<%_ for (const [i, arg] of params.entries()) if (!arg.isReturn) { _%>
<%- arg.name %><% if (arg.isOptional) { %>?<% } %>: <%- arg.elementType?.jsType ?? arg.jsType _%><% if (arg.isArray) { %>[]<% } _%>
<% if (i < params.length-1) { %>,<% } _%>
<%_ } %>