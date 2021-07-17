<%- func.name %>(<%- include('params.d.ts', { params: func.params }) %>):<%_ _%>
<%_ if (func.returns.length === 0) { %>void
<%_ } else if (func.returns.length === 1) { %><%- func.returns[0].elementType?.jsType ?? func.returns[0].jsType _%><% if (func.returns[0].isArray) { %>[]<% } else if (func.returns[0].isPointer) { %> | null<% } %>
<%_ } else { _%>
    { <%_ for (const r of func.returns) { _%><%- r.name %>: <%- r.elementType?.jsType ?? r.jsType %><% if (r.isArray) { %>[]<% } %>,<% } %> }
<%_ } _%>;

async <%- func.name %>_async(<%- include('params.d.ts', { params: func.params }) %>): Promise<<%_ _%>
<%_ if (func.returns.length === 0) { %>void
<%_ } else if (func.returns.length === 1) { %><%- func.returns[0].elementType?.jsType ?? func.returns[0].jsType _%><% if (func.returns[0].isArray) { %>[]<% } %>
<%_ } else { _%>
    { <%_ for (const r of func.returns) { _%><%- r.name %>: <%- r.elementType?.jsType ?? r.jsType %>,<% } %> }
<%_ } _%>>;