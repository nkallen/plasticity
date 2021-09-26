<%_ for (const _return of func.outParams) { _%>
    <% if (_return.shouldAlloc) { _%>
    <%- _return.rawType %> *<%- _return.name %> = new <%- _return.rawType %>;
    <%_ } else if (_return.isPrimitive || _return.isSPtr) { _%>
    <%- _return.rawType %> <%- _return.name %>;
    <%_ } else { _%>
    <%- _return.const %> <%- _return.rawType %> <%- _return.isPointer ? '*' : '' %> <%- _return.name %> = NULL;
    <%_ } _%>
<%_ } _%>