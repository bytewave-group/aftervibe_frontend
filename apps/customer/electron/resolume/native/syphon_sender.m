#import <AppKit/AppKit.h>
#import <OpenGL/gl.h>
#import <Syphon/SyphonOpenGLServer.h>

@interface AVSyphonSender : NSObject
@property (nonatomic, strong) NSOpenGLContext *context;
@property (nonatomic, strong) SyphonOpenGLServer *server;
@property (nonatomic) GLuint texture;
@property (nonatomic) int width;
@property (nonatomic) int height;
@end

@implementation AVSyphonSender

- (void)dealloc {
    [self.context makeCurrentContext];

    if (self.texture) {
        GLuint texture = self.texture;
        glDeleteTextures(1, &texture);
        self.texture = 0;
    }

    [self.server stop];
    [NSOpenGLContext clearCurrentContext];
}

@end

static NSOpenGLContext *AVCreateContext(void) {
    NSOpenGLPixelFormatAttribute attrs[] = {
        NSOpenGLPFAAccelerated,
        NSOpenGLPFAColorSize, 24,
        NSOpenGLPFAAlphaSize, 8,
        0
    };

    NSOpenGLPixelFormat *format = [[NSOpenGLPixelFormat alloc] initWithAttributes:attrs];

    if (!format) {
        return nil;
    }

    return [[NSOpenGLContext alloc] initWithFormat:format shareContext:nil];
}

void *av_sender_open(const char *name, int width, int height) {
    @autoreleasepool {
        NSOpenGLContext *context = AVCreateContext();

        if (!context) {
            return NULL;
        }

        [context makeCurrentContext];

        NSString *serverName = name
            ? [NSString stringWithUTF8String:name]
            : @"AfterVibeOverlay";

        SyphonOpenGLServer *server = [[SyphonOpenGLServer alloc]
            initWithName:serverName
                 context:[context CGLContextObj]
                 options:nil];

        if (!server) {
            [NSOpenGLContext clearCurrentContext];
            return NULL;
        }

        AVSyphonSender *sender = [AVSyphonSender new];
        sender.context = context;
        sender.server = server;
        sender.width = width;
        sender.height = height;

        GLuint texture = 0;
        glGenTextures(1, &texture);
        sender.texture = texture;

        return (__bridge_retained void *)sender;
    }
}

void av_sender_resize(void *handle, int width, int height) {
    @autoreleasepool {
        if (!handle) {
            return;
        }

        AVSyphonSender *sender = (__bridge AVSyphonSender *)handle;
        sender.width = width;
        sender.height = height;
    }
}

void av_sender_send(void *handle, const unsigned char *pixels, int width, int height) {
    @autoreleasepool {
        if (!handle || !pixels || width < 1 || height < 1) {
            return;
        }

        AVSyphonSender *sender = (__bridge AVSyphonSender *)handle;
        CGLContextObj cgl = [sender.context CGLContextObj];

        CGLLockContext(cgl);
        [sender.context makeCurrentContext];

        glBindTexture(GL_TEXTURE_RECTANGLE_EXT, sender.texture);
        glTexParameteri(GL_TEXTURE_RECTANGLE_EXT, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
        glTexParameteri(GL_TEXTURE_RECTANGLE_EXT, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
        glPixelStorei(GL_UNPACK_ROW_LENGTH, 0);
        glPixelStorei(GL_UNPACK_ALIGNMENT, 4);
        glTexImage2D(
            GL_TEXTURE_RECTANGLE_EXT,
            0,
            GL_RGBA8,
            width,
            height,
            0,
            GL_BGRA,
            GL_UNSIGNED_INT_8_8_8_8_REV,
            pixels
        );

        [sender.server
            publishFrameTexture:sender.texture
                  textureTarget:GL_TEXTURE_RECTANGLE_EXT
                    imageRegion:NSMakeRect(0, 0, width, height)
              textureDimensions:NSMakeSize(width, height)
                        flipped:YES];

        glBindTexture(GL_TEXTURE_RECTANGLE_EXT, 0);
        CGLUnlockContext(cgl);

        sender.width = width;
        sender.height = height;
    }
}

void av_sender_close(void *handle) {
    @autoreleasepool {
        if (!handle) {
            return;
        }

        AVSyphonSender *sender = (__bridge_transfer AVSyphonSender *)handle;
        (void)sender;
    }
}
