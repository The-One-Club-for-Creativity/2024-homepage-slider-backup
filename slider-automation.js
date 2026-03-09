/**
 * Slider Automation - Date-based functions for updating the homepage slider.
 * All changes are queued and applied when runScheduledUpdates(asOfDate) runs.
 * Depends on: jQuery, Slick slider
 */
(function (global) {
  "use strict";

  var removeQueue = [];
  var editQueue = [];
  var addQueue = [];

  function parseDate(val) {
    if (val instanceof Date) return val;
    if (typeof val === "string") return new Date(val);
    return null;
  }

  function getPaneIndex(paneID) {
    var $el = $("#" + paneID);
    if (!$el.length) return -1;
    var $container = $el.closest(".paneContainer");
    if (!$container.length) return -1;
    var $slide = $container.closest(".slick-slide");
    if (!$slide.length) return -1;
    return $(".slider .slick-slide").index($slide);
  }

  function triggerLinkContainerUpdate() {
    if (typeof $ === "function" && $(".slider").length) {
      $(".slider").trigger("setPosition");
    }
  }

  function buildPaneHTML(id, slug, mediaType, mediaURL, buttonText, caption) {
    var media =
      mediaType === "video"
        ? '<video autoplay muted loop playsinline id="' +
          id +
          '"><source src="' +
          mediaURL +
          '" type="video/mp4" /></video>'
        : '<img id="' + id + '" data-lazy="' + mediaURL + '" />';

    return (
      '<div class="paneContainer">' +
      '<a class="paneContainerLink" href="' +
      slug +
      '">' +
      media +
      '<div class="videoLinkContainer">' +
      '<h3 class="videoLinkText">' +
      caption +
      "</h3>" +
      '<a class="videoLink" href="' +
      slug +
      '">' +
      buttonText +
      "</a>" +
      "</div>" +
      "</a>" +
      "</div>"
    );
  }

  function applyRemove(paneID) {
    var idx = getPaneIndex(paneID);
    if (idx < 0) return;
    $(".slider").slick("slickRemove", idx);
    triggerLinkContainerUpdate();
  }

  function applyEdit(paneID, mediaType, options) {
    var $media = $("#" + paneID);
    if (!$media.length) return { mediaTypeChanged: false };

    var currentType = $media.is("img") ? "image" : "video";
    var mediaTypeChanged = currentType !== mediaType;

    if (mediaTypeChanged) {
      var $parent = $media.closest("a.paneContainerLink");
      var newMedia;
      if (mediaType === "video") {
        newMedia = $(
          '<video autoplay muted loop playsinline id="' +
            paneID +
            '"><source src="' +
            (options.newMediaURL ||
              $media.attr("data-lazy") ||
              $media.find("source").attr("src") ||
              "") +
            '" type="video/mp4" /></video>'
        );
      } else {
        newMedia = $(
          '<img id="' +
            paneID +
            '" data-lazy="' +
            (options.newMediaURL ||
              $media.find("source").attr("src") ||
              $media.attr("data-lazy") ||
              "") +
            '" />'
        );
      }
      $media.replaceWith(newMedia);
    } else {
      if (options.newMediaURL) {
        if (mediaType === "image") {
          $media.attr("data-lazy", options.newMediaURL);
        } else {
          $media.find("source").attr("src", options.newMediaURL);
        }
      }
    }

    var $container = $("#" + paneID).closest(".paneContainer");
    if (options.newSlug) {
      $container.find(".paneContainerLink").attr("href", options.newSlug);
      $container.find(".videoLink").attr("href", options.newSlug);
    }
    if (options.newCaption !== undefined) {
      $container.find(".videoLinkText").text(options.newCaption);
    }
    if (options.newButtonText !== undefined) {
      $container.find(".videoLink").text(options.newButtonText);
    }

    triggerLinkContainerUpdate();
    return { mediaTypeChanged: mediaTypeChanged };
  }

  function applyAdd(
    id,
    slug,
    mediaType,
    mediaURL,
    buttonText,
    caption,
    position
  ) {
    var html = buildPaneHTML(
      id,
      slug,
      mediaType,
      mediaURL,
      buttonText,
      caption
    );
    var $slider = $(".slider");
    var slideCount = $slider.slick("getSlick").$slides.length;
    var idx =
      position !== undefined && position >= 0
        ? Math.min(position, slideCount)
        : slideCount;
    $slider.slick("slickAdd", html, idx);
    triggerLinkContainerUpdate();
  }

  var SliderAutomation = {
    removePane: function (paneID, removeAfterDate) {
      var d = parseDate(removeAfterDate);
      if (!d) return;
      removeQueue.push({ paneID: paneID, removeAfter: d });
    },

    editPane: function (paneID, mediaType, effectiveDate, options) {
      var d = parseDate(effectiveDate);
      if (!d) return;
      options = options || {};
      editQueue.push({
        paneID: paneID,
        mediaType: mediaType,
        effectiveDate: d,
        options: options,
      });
    },

    addPane: function (
      id,
      slug,
      mediaType,
      mediaURL,
      buttonText,
      caption,
      effectiveDate,
      position
    ) {
      var d = parseDate(effectiveDate);
      if (!d) return;
      addQueue.push({
        id: id,
        slug: slug,
        mediaType: mediaType,
        mediaURL: mediaURL,
        buttonText: buttonText,
        caption: caption,
        effectiveDate: d,
        position: position,
      });
    },

    runScheduledUpdates: function (asOfDate) {
      var now = parseDate(asOfDate) || new Date();
      var i;

      var toRemove = removeQueue.filter(function (r) {
        return now >= r.removeAfter;
      });
      removeQueue = removeQueue.filter(function (r) {
        return now < r.removeAfter;
      });

      var toEdit = editQueue.filter(function (e) {
        return now >= e.effectiveDate;
      });
      editQueue = editQueue.filter(function (e) {
        return now < e.effectiveDate;
      });

      var toAdd = addQueue.filter(function (a) {
        return now >= a.effectiveDate;
      });
      addQueue = addQueue.filter(function (a) {
        return now < a.effectiveDate;
      });

      toRemove.sort(function (a, b) {
        return getPaneIndex(b.paneID) - getPaneIndex(a.paneID);
      });
      for (i = 0; i < toRemove.length; i++) {
        applyRemove(toRemove[i].paneID);
      }

      for (i = 0; i < toEdit.length; i++) {
        var e = toEdit[i];
        applyEdit(e.paneID, e.mediaType, e.options);
      }

      toAdd.sort(function (a, b) {
        return (b.position ?? 999) - (a.position ?? 999);
      });
      for (i = 0; i < toAdd.length; i++) {
        var a = toAdd[i];
        applyAdd(
          a.id,
          a.slug,
          a.mediaType,
          a.mediaURL,
          a.buttonText,
          a.caption,
          a.position
        );
      }
    },
  };

  global.SliderAutomation = SliderAutomation;
})(typeof window !== "undefined" ? window : this);
