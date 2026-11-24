const PROBLEM_TITLES = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    409: "Conflict",
    422: "Unprocessable Entity",
};

export function problem(status, detail, instance) {
    return Response.json(
        {
            type: "about:blank",
            title: PROBLEM_TITLES[status] || "Error",
            status,
            detail,
            instance,
        },
        { status },
    );
}
