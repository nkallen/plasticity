<%- func.isStaticMethod ? 'static' : '' %> <%- func.jsName %>(<%- include('params.d.ts', { params: func.params }) %>):<%_ _%>
<%_ if (func.returns.length === 0) { %>void
<%_ } else if (func.returns.length === 1) { %><%- func.returns[0].elementType?.jsType ?? func.returns[0].jsType _%><% if (func.returns[0].isArray) { %>[]<% } else if (func.returnType.isReturn && func.returnType.isPointer) { %> | null<% } %>
<%_ } else { _%>
    { <%_ for (const r of func.returns) { _%><%- r.name %>: <% if (r.isNumberPair) { %>[number, number]<% } else { %><%- r.elementType?.jsType ?? r.jsType %><% if (r.isArray ) { %>[]<% } %><% } %>,<% } %> }
<%_ } _%>;

<%- func.isStaticMethod ? 'static' : '' %> async <%- func.jsName %>_async(<%- include('params.d.ts', { params: func.params }) %>): Promise<<%_ _%>
<%_ if (func.returns.length === 0) { %>void
<%_ } else if (func.returns.length === 1) { %><%- func.returns[0].elementType?.jsType ?? func.returns[0].jsType _%><% if (func.returns[0].isArray) { %>[]<% } %>
<%_ } else { _%>
    { <%_ for (const r of func.returns) { _%><%- r.name %>: <% if (r.isNumberPair) { %>[number, number]<% } else { %><%- r.elementType?.jsType ?? r.jsType %><% if (r.isArray ) { %>[]<% } %><% } %>,<% } %> }
<%_ } _%>>;