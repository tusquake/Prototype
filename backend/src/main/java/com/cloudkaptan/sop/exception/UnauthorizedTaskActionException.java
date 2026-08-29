package com.cloudkaptan.sop.exception;

public class UnauthorizedTaskActionException extends RuntimeException {

    public UnauthorizedTaskActionException(String message) {
        super(message);
    }
}
