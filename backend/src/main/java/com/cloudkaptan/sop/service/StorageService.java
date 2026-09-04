package com.cloudkaptan.sop.service;

import java.io.InputStream;

public interface StorageService {

    String uploadFile(String objectPath, InputStream inputStream, String contentType, long contentLength);

    InputStream downloadFileStream(String objectPath);

    boolean deleteFile(String objectPath);
}
